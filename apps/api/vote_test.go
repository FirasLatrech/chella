package main

import "testing"

func TestNextPostVote(t *testing.T) {
	tests := []struct {
		name      string
		previous  int
		requested int
		want      int
	}{
		{"neutral to up", 0, 1, 1},
		{"neutral to down", 0, -1, -1},
		{"neutral retract", 0, 0, 0},
		{"up toggles off", 1, 0, 0},
		{"up button toggles off", 1, 1, 0},
		{"up clears before down", 1, -1, 0},
		{"down toggles off", -1, 0, 0},
		{"down button toggles off", -1, -1, 0},
		{"down clears before up", -1, 1, 0},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := nextPostVote(test.previous, test.requested); got != test.want {
				t.Fatalf("nextPostVote(%d, %d) = %d, want %d", test.previous, test.requested, got, test.want)
			}
		})
	}
}
