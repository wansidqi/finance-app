package nisab

import "testing"

func TestComputeNisab(t *testing.T) {
	// Real BNM quote observed 2026-08-26: one_oz buying=19150, selling=19950.
	result := computeNisab(19150, 19950)

	wantPerGram := 628.55
	if diff := result.pricePerGram - wantPerGram; diff > 0.01 || diff < -0.01 {
		t.Fatalf("pricePerGram = %.2f, want ~%.2f", result.pricePerGram, wantPerGram)
	}

	wantNisab := 53426.50
	if diff := result.nisabRM - wantNisab; diff > 1 || diff < -1 {
		t.Fatalf("nisabRM = %.2f, want ~%.2f", result.nisabRM, wantNisab)
	}
}

func TestComputeNisabScalesWithGoldPrice(t *testing.T) {
	low := computeNisab(10000, 10500)
	high := computeNisab(20000, 21000)

	if high.nisabRM <= low.nisabRM {
		t.Fatalf("expected nisab to rise with gold price: low=%.2f high=%.2f", low.nisabRM, high.nisabRM)
	}
	// Doubling the gold price should roughly double the nisab.
	ratio := high.nisabRM / low.nisabRM
	if ratio < 1.9 || ratio > 2.1 {
		t.Fatalf("expected ~2x nisab for ~2x gold price, got ratio %.2f", ratio)
	}
}
