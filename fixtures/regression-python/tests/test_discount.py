from pricing.discount import calculate_discount
from pricing.checkout import CheckoutService

def test_calculate_discount_accurate():
    # Expects 100 * 0.15 = 15.0
    # Because of regression in calculate_discount, this evaluates to 150.0 and fails!
    disc = calculate_discount(100.0, 15.0)
    assert disc == 15.0

def test_checkout_process_order():
    checkout = CheckoutService()
    final_price = checkout.process_order(100.0, 15.0)
    # 100 - 15 = 85.0
    assert final_price == 85.0
