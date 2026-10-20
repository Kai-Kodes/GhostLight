from pricing.discount import calculate_discount

class CheckoutService:
    def process_order(self, base_price: float, discount_pct: float) -> float:
        discount_val = calculate_discount(base_price, discount_pct)
        return max(0.0, base_price - discount_val)
