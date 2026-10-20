import hashlib

def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode('utf-8')).hexdigest()

def verify_password(raw_password: str, expected_hash: str) -> bool:
    return hash_password(raw_password) == expected_hash
