package main

import (
	"flag"
	"os"

	"github.com/apex/log"
	"github.com/apex/log/handlers/text"
)

const (
	// DefaultUpdateFPS describes the update rate for the game state.
	DefaultUpdateFPS = 40.0

	// DefaultGopherSize is the size in px for the width and height of the gopher.
	DefaultGopherSize = 50
)

var addr = flag.String("addr", ":8080", "http service address")
var verbose = flag.Bool("v", false, "enable verbose logging")

func main() {
	flag.Parse()

	log.SetHandler(text.New(os.Stderr))

	if *verbose {
		log.SetLevel(log.DebugLevel)
	} else {
		log.SetLevel(log.InfoLevel)
	}

	ctx := log.WithFields(log.Fields{
		"app": "spacegophers",
	})

	s := NewServer(ctx, *addr)

	// serve the server
	s.Serve()
}
