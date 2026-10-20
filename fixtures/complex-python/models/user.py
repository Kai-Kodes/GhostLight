from models.base import BaseModel

class User(BaseModel):
    def __init__(self, id: str, username: str, password_hash: str):
        super().__init__(id)
        self.username = username
        self.password_hash = password_hash

    def to_dict(self):
        d = super().to_dict()
        d["username"] = self.username
        return d
