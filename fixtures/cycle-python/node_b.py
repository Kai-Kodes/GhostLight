from node_a import func_a

def func_b(val: int) -> int:
    if val <= 0:
        return 0
    return func_a(val - 1)
