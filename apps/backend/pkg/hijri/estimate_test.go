package hijri

import (
	"testing"
	"time"
)

func TestAddHijriYear(t *testing.T) {
	samples := []time.Time{
		time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC),
		time.Date(2030, 12, 31, 0, 0, 0, 0, time.UTC),
		time.Date(2020, 3, 10, 0, 0, 0, 0, time.UTC),
	}

	for _, sample := range samples {
		y, m, d := estimate(sample)
		next := AddHijriYear(sample)
		ny, nm, nd := estimate(next)

		if ny != y+1 || nm != m || nd != d {
			t.Fatalf("AddHijriYear(%v) = %v (hijri %d-%d-%d), want hijri %d-%d-%d",
				sample, next, ny, nm, nd, y+1, m, d)
		}
	}
}

// TestEstimateMatchesKnownAnchor checks the arithmetic estimate against a
// real, well-documented anchor: 1 Muharram 1447H fell on 27 June 2025 per
// Malaysia's JAKIM sighting announcement.
func TestEstimateMatchesKnownAnchor(t *testing.T) {
	y, m, d := estimate(time.Date(2025, 6, 27, 0, 0, 0, 0, time.UTC))
	if y != 1447 || m != 1 || d != 1 {
		t.Fatalf("got %d-%d-%d, want 1447-1-1", y, m, d)
	}
}
