use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fmt;
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

/// Lowercase hexadecimal SHA-256 digest representing file contents.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct ContentHash(String);

impl ContentHash {
    pub fn new<S: Into<String>>(hex: S) -> Self {
        Self(hex.into())
    }

    /// Computes hash from in-memory byte slice.
    pub fn from_bytes(bytes: &[u8]) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(bytes);
        let result = hasher.finalize();
        Self(format!("{:x}", result))
    }

    /// Computes hash from a file, enforcing a maximum byte limit for safety.
    pub fn from_file<P: AsRef<Path>>(path: P, max_bytes: u64) -> io::Result<Self> {
        let path = path.as_ref();
        let metadata = std::fs::symlink_metadata(path)?;
        if metadata.len() > max_bytes {
            return Err(io::Error::new(
                io::ErrorKind::FileTooLarge,
                format!("File {:?} exceeds maximum allowed size ({} bytes)", path, max_bytes),
            ));
        }

        let mut file = File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        let mut total_read = 0;

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            total_read += bytes_read as u64;
            if total_read > max_bytes {
                return Err(io::Error::new(
                    io::ErrorKind::FileTooLarge,
                    format!("File {:?} exceeded size limit during reading", path),
                ));
            }
            hasher.update(&buffer[..bytes_read]);
        }

        let result = hasher.finalize();
        Ok(Self(format!("{:x}", result)))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ContentHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A deterministic fingerprint of an entire repository state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepositoryFingerprint {
    pub root_hash: String,
    pub file_count: usize,
    pub file_hashes: BTreeMap<String, ContentHash>,
}

impl RepositoryFingerprint {
    /// Computes a deterministic Merkle-style root hash from an ordered map of file paths to hashes.
    pub fn compute(file_hashes: BTreeMap<String, ContentHash>) -> Self {
        let mut hasher = Sha256::new();
        for (rel_path, hash) in &file_hashes {
            hasher.update(rel_path.as_bytes());
            hasher.update(b":");
            hasher.update(hash.as_str().as_bytes());
            hasher.update(b"\n");
        }
        let root_hash = format!("{:x}", hasher.finalize());
        let file_count = file_hashes.len();
        Self {
            root_hash,
            file_count,
            file_hashes,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_hash_consistency() {
        let data = b"print('hello world')";
        let hash1 = ContentHash::from_bytes(data);
        let hash2 = ContentHash::from_bytes(data);
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.as_str().len(), 64);
    }

    #[test]
    fn test_repository_fingerprint_determinism() {
        let mut map1 = BTreeMap::new();
        map1.insert("a.py".to_string(), ContentHash::from_bytes(b"content a"));
        map1.insert("b.py".to_string(), ContentHash::from_bytes(b"content b"));

        let mut map2 = BTreeMap::new();
        // Insert in reverse order; BTreeMap keeps sorted key order
        map2.insert("b.py".to_string(), ContentHash::from_bytes(b"content b"));
        map2.insert("a.py".to_string(), ContentHash::from_bytes(b"content a"));

        let fp1 = RepositoryFingerprint::compute(map1);
        let fp2 = RepositoryFingerprint::compute(map2);

        assert_eq!(fp1.root_hash, fp2.root_hash);
        assert_eq!(fp1.file_count, 2);
    }
}
