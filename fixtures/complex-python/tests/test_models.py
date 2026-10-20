from models.user import User

def test_user_inheritance():
    user = User("u-42", "bob", "hash123")
    assert user.validate() is True
    d = user.to_dict()
    assert d["id"] == "u-42"
    assert d["username"] == "bob"
