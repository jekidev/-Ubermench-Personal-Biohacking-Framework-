use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    io::{Read, Write},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

const DEFAULT_TIMEOUT_MS: u64 = 15_000;
const MAX_OUTPUT_BYTES: usize = 2 * 1024 * 1024;
const MAX_STDIN_BYTES: usize = 1024 * 1024;
const MAX_ARGS: usize = 64;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_allowlisted_command() {
        assert!(validate_command("rm").is_err());
    }

    #[test]
    fn rejects_path_based_command() {
        assert!(validate_command("/usr/bin/node").is_err());
    }

    #[test]
    fn clamps_timeout() {
        assert_eq!(timeout_ms(Some(1)), 250);
        assert_eq!(timeout_ms(Some(100_000)), 60_000);
    }

    #[test]
    fn rejects_oversized_args() {
        assert!(validate_args(&["x".repeat(MAX_ARG_BYTES + 1)]).is_err());
    }

    #[test]
    fn rejects_too_many_args() {
        assert!(validate_args(&["x".into(); MAX_ARGS + 1]).is_err());
    }

    #[test]
    fn approval_is_single_use_and_exactly_bound() {
        let registry = McpApprovalRegistry::default();
        let command = "node";
