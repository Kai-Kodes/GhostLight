from calculator import Calculator

def test_calculator_sum():
    calc = Calculator()
    assert calc.compute_sum(5, 7) == 12

def test_calculator_diff():
    calc = Calculator()
    assert calc.compute_diff(10, 4) == 6
