package main

import (
	"encoding/json"
	"sort"

	"github.com/apex/log"
	"github.com/xtgo/uuid"
)

// NewGameID creates a new game id to be used.
func NewGameID() string {
	return uuid.NewRandom().String()[0:8]
}

// NewGame creates a new game instance.
func NewGame(ctx log.Interface, id string) Game {
	gs := NewGameState(ctx)
	cp := NewCommandProcessor(&gs)

	return Game{
		Log: ctx.WithFields(log.Fields{
			"module": "Game",
			"id":     id,
		}),
		State:            &gs,
		CommandProcessor: &cp,
		register:         make(chan *User),
		unregister:       make(chan *User),
		commands:         make(chan Command),
	}
}

// Game stores the pieces of a game instance and it's users and manages the
// messages from the users.
type Game struct {
	ID               string
	Log              log.Interface
	State            *GameState
	CommandProcessor *CommandProcessor

	commands   chan Command
	register   chan *User
	unregister chan *User
}

// Run starts up the listener for the game events.
func (g *Game) Run() {
	// start the state loop
	go g.State.Loop()

	// start the command processor loop
	go g.CommandProcessor.Loop()

	for {
		select {
		case user := <-g.register:

			g.State.Users[user] = true

			// associate this user with this game
			user.g = g

			// start the user's handler
			go user.run()

			initPl := map[string]interface{}{
				"t": 0,
				"i": user.ID,
			}

			pl, err := json.Marshal(initPl)
			if err != nil {
				g.Log.WithError(err).Debug("could not marshal init payload")
				return
			}

			user.send <- pl

			g.Log.WithField("users", len(g.State.Users)).Debug("user registered")

		case user := <-g.unregister:
			if _, ok := g.State.Users[user]; ok {
				delete(g.State.Users, user)
				close(user.send)
			}

			g.Log.WithField("users", len(g.State.Users)).Debug("user unregistered")
		case command := <-g.commands:
			g.Log.WithFields(log.Fields{
				"message": command.Message,
				"user":    command.User,
			}).Debug("new command recieved")

			// queue up the command into the command processor
			g.CommandProcessor.Queue(command)

		case state := <-g.State.updateState:
			var gophers = make([]Gopher, 0, len(state.Users))
			for user := range state.Users {
				gophers = append(gophers, user.Gopher)
			}

			sort.Sort(ByScore(gophers))

			var shots = make([]Shot, 0, len(state.Shots))
			for shot := range state.Shots {
				shots = append(shots, *shot)
			}

			pl, err := json.Marshal(map[string]interface{}{
				"t": 1,
				"g": gophers,
				"s": shots,
			})
			if err != nil {
				g.Log.WithError(err).Debug("could not marshal game state payload")
				return
			}

			for user := range state.Users {
				select {
				case user.send <- pl:
				default:
					close(user.send)
					delete(g.State.Users, user)
				}
			}
		}
	}
}
