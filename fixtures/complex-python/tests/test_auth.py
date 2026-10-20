from services.auth_service import AuthService

def test_registration_and_login():
    auth = AuthService()
    user = auth.register("u-1", "alice", "secret123", "alice@example.com")
    assert user.username == "alice"
    assert auth.login("alice", "secret123") is True
    assert auth.login("alice", "wrongpass") is False
