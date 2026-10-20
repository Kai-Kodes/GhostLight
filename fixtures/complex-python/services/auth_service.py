from models.user import User
from utils.crypto import hash_password, verify_password
from services.notification import send_welcome_email

class AuthService:
    def __init__(self):
        self.users = {}

    def register(self, user_id: str, username: str, password: str, email: str) -> User:
        hashed = hash_password(password)
        user = User(user_id, username, hashed)
        self.users[username] = user
        send_welcome_email(username, email)
        return user

    def login(self, username: str, password: str) -> bool:
        user = self.users.get(username)
        if not user:
            return False
        return verify_password(password, user.password_hash)
