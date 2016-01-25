package main

// NewCommand creates a new command from a user.
func NewCommand(u *User, message string) Command {
	var cmd string

	switch message {
	case "u":
		cmd = "up"
	case "r":
		cmd = "right"
	case "d":
		cmd = "down"
	case "l":
		cmd = "left"
	case "f":
		cmd = "fire"
	}

	return Command{
		User:    u,
		Message: cmd,
	}
}

// Command represents the instruction given by a user during game play.
type Command struct {
	User    *User
	Message string
}
