from math_ops import add, subtract

class Calculator:
    def __init__(self, initial: int = 0):
        self.value = initial

    def compute_sum(self, a: int, b: int) -> int:
        res = add(a, b)
        self.value = res
        return res

    def compute_diff(self, a: int, b: int) -> int:
        res = subtract(a, b)
        self.value = res
        return res
