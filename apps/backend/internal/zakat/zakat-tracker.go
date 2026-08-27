package zakat

import "time"

type ZakatTracker struct {
	Id            uint       `db:"id" json:"id"`
	UserId        *uint      `db:"user_id" json:"user_id"`
	Category      string     `db:"category" json:"category"`
	LastPaidDate  *time.Time `db:"last_paid_date" json:"last_paid_date"`
	HaulStartDate *time.Time `db:"haul_start_date" json:"haul_start_date"`
	Status        string     `db:"status" json:"status"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     *time.Time `db:"updated_at" json:"updated_at"`
}

type TrackerDto struct {
	Id        *uint      `db:"id" json:"id"`
	UserId    *uint      `db:"user_id" json:"user_id"`
	Category  string     `json:"category"`
	Value     *float64   `json:"value"`
	Status    *string    `db:"status" json:"status"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt *time.Time `db:"updated_at" json:"updated_at"`

	IsTracked         bool               `json:"is_tracked"`
	HaulStatus        string             `json:"haul_status"`
	Nisab             float64            `json:"nisab"`
	NisabReached      bool               `json:"nisab_reached"`
	LastPaidDate      *time.Time         `json:"last_paid_date"`
	LastPaidDateHijri *string            `json:"last_paid_date_hijri"`
	HaulStartDate     *time.Time         `json:"haul_start_date"`
	NextDueDate       *time.Time         `json:"next_due_date"`
	NextDueDateHijri  *string            `json:"next_due_date_hijri"`
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
