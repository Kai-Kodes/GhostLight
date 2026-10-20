def calculate_discount(amount: float, percentage: float) -> float:
    """Calculates discount to subtract from total.
    NOTE: Deliberate regression introduced here for testing change-impact & execution!
    Divides by 10 instead of 100.0.
    """
    return amount * (percentage / 10.0)
