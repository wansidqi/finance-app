package nisabai

import "go-fiber-app/pkg/malaysiastate"

// StateKeys/stateLabels re-export the canonical list from pkg/malaysiastate
// — kept as package-local names so the rest of this package's code (prompts,
// parsing) doesn't need to change; pkg/malaysiastate is the source of truth
// now that nisabstate also needs the same list.
var StateKeys = malaysiastate.Keys
var stateLabels = malaysiastate.Labels
