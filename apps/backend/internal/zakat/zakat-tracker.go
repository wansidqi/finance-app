package zakat

import "time"

type ZakatTracker struct {
	Id           uint       `db:"id" json:"id"`
	UserId       *uint      `db:"user_id" json:"user_id"`
	Category     string     `db:"category" json:"category"`
	LastPaidDate time.Time  `db:"last_paid_date" json:"last_paid_date"`
	Status       string     `db:"status" json:"status"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    *time.Time `db:"updated_at" json:"updated_at"`
}

type TrackerDto struct {
	Id        *uint      `db:"id" json:"id"`
	UserId    *uint      `db:"user_id" json:"user_id"`
	Category  string     `json:"category"`
	Value     *float64   `json:"value"`
	Status    *string    `db:"status" json:"status"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt *time.Time `db:"updated_at" json:"updated_at"`

	HaulStatus        string             `db:"haul_status" json:"haul_status"`
	NisabReached      bool               `db:"nisab_reached" json:"nisab_reached"`
	LastPaidDate      *time.Time         `db:"last_paid_date" json:"last_paid_date"`
	NextDueDate       time.Time          `db:"next_due_date" json:"next_due_date"`
	ZakatDue          float64            `json:"zakat_due"`
	PlatformBreakdown []PlatformShareDto `json:"platform_breakdown"`
}

// PlatformShareDto breaks a category's zakat due down per platform,
// proportional to each platform's share of the category's total value —
// so it's clear how much to withdraw from each account.
type PlatformShareDto struct {
	Platform string  `json:"platform"`
	Value    float64 `json:"value"`
	ZakatDue float64 `json:"zakat_due"`
}

type UpdateRequest struct {
	UserId       uint       `json:"user_id"`
	Category     *string    `db:"category" json:"category"`
	LastPaidDate *time.Time `db:"last_paid_date" json:"last_paid_date"`
	Status       *string    `db:"status" json:"status"`
}
