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

	HaulStatus   string     `db:"haul_status" json:"haul_status"`
	NisabReached bool       `db:"nisab_reached" json:"nisab_reached"`
	LastPaidDate *time.Time `db:"last_paid_date" json:"last_paid_date"`
	NextDueDate  time.Time  `db:"next_due_date" json:"next_due_date"`
}

type UpdateRequest struct {
	UserId       uint       `json:"user_id"`
	Category     *string    `db:"category" json:"category"`
	LastPaidDate *time.Time `db:"last_paid_date" json:"last_paid_date"`
	Status       *string    `db:"status" json:"status"`
}
