package zakat

import (
	"go-fiber-app/pkg/hijri"
	"testing"
	"time"
)

func TestComputeHaulStatus(t *testing.T) {
	now := time.Date(2026, 8, 27, 0, 0, 0, 0, time.UTC)

	t.Run("never tracked, nisab not reached", func(t *testing.T) {
		status, due, start := computeHaulStatus(nil, nil, false, now)
		if status != "PENDING" || due != nil || start != nil {
			t.Fatalf("got status=%s due=%v start=%v", status, due, start)
		}
	})

	t.Run("nisab just reached, never paid before, starts a new haul today", func(t *testing.T) {
		status, due, start := computeHaulStatus(nil, nil, true, now)
		if status != "PENDING" || start == nil || !start.Equal(now) {
			t.Fatalf("got status=%s start=%v", status, start)
		}
		wantDue := hijri.AddHijriYear(now)
		if due == nil || !due.Equal(wantDue) {
			t.Fatalf("got due=%v want=%v", due, wantDue)
		}
	})

	t.Run("haul never started but a past payment exists: anchors to last_paid_date, not today", func(t *testing.T) {
		lastPaid := now.AddDate(0, 0, -100)
		status, due, start := computeHaulStatus(nil, &lastPaid, true, now)
		if start == nil || !start.Equal(lastPaid) {
			t.Fatalf("expected haul start to anchor to last_paid_date, got start=%v", start)
		}
		wantDue := hijri.AddHijriYear(lastPaid)
		if due == nil || !due.Equal(wantDue) {
			t.Fatalf("got due=%v want=%v", due, wantDue)
		}
		_ = status
	})

	t.Run("well before due date is pending", func(t *testing.T) {
		start := now.AddDate(0, 0, -100)
		status, _, newStart := computeHaulStatus(&start, nil, true, now)
		if status != "PENDING" || !newStart.Equal(start) {
			t.Fatalf("got status=%s newStart=%v", status, newStart)
		}
	})

	t.Run("within reminder window is due", func(t *testing.T) {
		start := now.AddDate(0, 0, -351)
		status, _, _ := computeHaulStatus(&start, nil, true, now)
		if status != "DUE" {
			t.Fatalf("got status=%s", status)
		}
	})

	t.Run("past due date with nisab held is overdue and haul start is unchanged", func(t *testing.T) {
		start := now.AddDate(0, 0, -400)
		status, due, newStart := computeHaulStatus(&start, nil, true, now)
		if status != "OVERDUE" || newStart == nil || !newStart.Equal(start) {
			t.Fatalf("got status=%s newStart=%v", status, newStart)
		}
		if due == nil {
			t.Fatal("expected a due date to still be reported while overdue")
		}
	})

	t.Run("cycle completes without nisab held resets the haul", func(t *testing.T) {
		start := now.AddDate(0, 0, -400)
		status, due, newStart := computeHaulStatus(&start, nil, false, now)
		if status != "PENDING" || due != nil || newStart != nil {
			t.Fatalf("got status=%s due=%v newStart=%v", status, due, newStart)
		}
	})

	t.Run("mid-cycle dip below nisab does not reset the haul", func(t *testing.T) {
		start := now.AddDate(0, 0, -100)
		status, _, newStart := computeHaulStatus(&start, nil, false, now)
		if status != "PENDING" || newStart == nil || !newStart.Equal(start) {
			t.Fatalf("got status=%s newStart=%v", status, newStart)
		}
	})
}
