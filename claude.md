## General
it is 2025
use modern versions of dependencies, latest or similar
edit files directly, do not use cat << 'EOF' pattern

When you start, take time to familiarise yourself with the codebase

always aim to give proper fixes, not workarounds or hacks
don't regenerate files, either copy them if you need to, or if possible create a shared function or component to avoid code replication


## Polkadot-specific
use PAPI (polkadot-api), do not use polkadot js api or anything @polkadot/*
do not try to submit multiple transactions in a single block. use utility.batchAll (atomic batch) / forceBatch (if an element of the batch fails the rest will still be executed)