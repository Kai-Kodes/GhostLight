class BaseModel:
    def __init__(self, id: str):
        self.id = id

    def to_dict(self):
        return {"id": self.id}

    def validate(self) -> bool:
        return self.id is not None and len(self.id) > 0
