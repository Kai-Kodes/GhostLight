from node_b import func_b

def func_a(val: int) -> int:
    if val <= 0:
        return 0
    return func_b(val - 1)
