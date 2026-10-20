from tax.vat import calculate_vat

def test_vat_standard():
    vat = calculate_vat(100.0, 0.20)
    assert vat == 20.0
