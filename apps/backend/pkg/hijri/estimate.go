package hijri

import "time"

// toJulianDay and julianDayToTime are the standard Fliegel & Van Flandern
// Gregorian <-> Julian Day Number conversion pair.
func toJulianDay(t time.Time) int {
	y, m, d := t.Year(), int(t.Month()), t.Day()
	a := (14 - m) / 12
	y2 := y + 4800 - a
	m2 := m + 12*a - 3
	return d + (153*m2+2)/5 + 365*y2 + y2/4 - y2/100 + y2/400 - 32045
}

func julianDayToTime(jd int) time.Time {
	a := jd + 32044
	b := (4*a + 3) / 146097
	c := a - (146097*b)/4
	d := (4*c + 3) / 1461
	e := c - (1461*d)/4
	m := (5*e + 2) / 153
	day := e - (153*m+2)/5 + 1
	month := m + 3 - 12*(m/10)
	year := 100*b + d - 4800 + m/10
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

// estimate converts a Gregorian date to the tabular civil Islamic calendar
// (the Kuwaiti algorithm) — an arithmetic approximation, not based on moon
// sighting, so it can land a day or two off Malaysia's official
// (rukyah-based) calendar. Used only when JAKIM's API is unreachable.
func estimate(t time.Time) (year int, month int, day int) {
	jd := toJulianDay(t)
	l := jd - 1948440 + 10632
	n := (l - 1) / 10631
	l = l - 10631*n + 354
	j := ((10985-l)/5316)*((50*l)/17719) + (l / 5670 * ((43 * l) / 15238))
	l = l - ((30-j)/15)*((17719*j)/50) - (j/16)*((15238*j)/43) + 29
	month = (24 * l) / 709
	day = l - (709*month)/24
	year = 30*n + j - 30
	return
}

// AddHijriYear returns the Gregorian date one Hijri year after t — same
// Hijri day and month, year+1 — rather than a fixed +354/+365 day offset,
// since Hijri years vary between 354 and 355 days.
//
// It's used for projecting the next zakat due date, which is necessarily an
// estimate anyway (JAKIM hasn't sighted a month a year in the future), so it
// always uses the arithmetic calendar rather than the live API.
func AddHijriYear(t time.Time) time.Time {
	y, m, d := estimate(t)
	targetY, targetM, targetD := y+1, m, d

	jd := toJulianDay(t) + 354
	for i := 0; i < 5; i++ {
		cy, cm, cd := estimate(julianDayToTime(jd))
		if cy == targetY && cm == targetM && cd == targetD {
			break
		}
		if cy < targetY || (cy == targetY && cm < targetM) || (cy == targetY && cm == targetM && cd < targetD) {
			jd++
		} else {
			jd--
		}
	}
	return julianDayToTime(jd)
}
