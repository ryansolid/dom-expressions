//! Corpus-wide reconciliation of the semantic-trace execution contract.
//!
//! The source census is independent of DOM lowering. Compiling the complete
//! Babel fixture corpus and adversarial probe corpus with tracing enabled makes
//! every lowering path prove that it reported the sites the census found. The
//! transform half is checked against a checked-in output baseline produced
//! from the parent compiler revision. A trace-on/trace-off comparison is still
//! useful as a local additive check, but it is not the invariant: both sides
//! of that comparison can share the same codegen regression.
#![cfg(not(feature = "node"))]

use std::path::{Path, PathBuf};

use dom_expressions_compiler::{CompileOptions, compile};

fn fixture_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../babel-plugin-jsx/test")
        .canonicalize()
        .expect("the Babel fixture corpus is a workspace sibling")
}

/// Every fixture source in every Babel family. The producer is DOM-only, so
/// all families are fed through the same DOM options; inputs the parent
/// compiler rejects remain explicit `reject` entries in the output baseline.
fn fixture_sources() -> Vec<(String, String)> {
    let mut sources = Vec::new();
    let root = fixture_root();
    let mut dirs = std::fs::read_dir(&root)
        .expect("fixture root is readable")
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().into_owned();
            name.starts_with("__").then(|| (name, entry.path()))
        })
        .collect::<Vec<_>>();
    dirs.sort();

    for (dir_name, dir) in dirs {
        let mut fixtures = std::fs::read_dir(&dir)
            .expect("fixture directory is readable")
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let code = entry.path().join("code.js");
                code.exists().then(|| {
                    (
                        format!("{dir_name}/{}", entry.file_name().to_string_lossy()),
                        code,
                    )
                })
            })
            .collect::<Vec<_>>();
        fixtures.sort();

        for (id, path) in fixtures {
            sources.push((id, std::fs::read_to_string(path).expect("fixture is utf-8")));
        }
    }
    sources
}

/// Read the adversarial JSX probe cases from the parity suite so the
/// reconciliation corpus cannot silently drift away from the cases that
/// exercise compiler output. Probe sources are JavaScript template literals;
/// escaped backticks and interpolation markers must be restored before parse.
fn probe_sources() -> Vec<(String, String)> {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("__tests__/parity-probes.test.js");
    let text = std::fs::read_to_string(path).expect("the probe corpus is readable");
    let body = {
        let start = text
            .find("const cases = {")
            .expect("probe corpus has cases");
        let end = text
            .find("describe(\"Babel vs Oxc parity probes\"")
            .expect("probe corpus has an end");
        &text[start..end]
    };

    let mut cases = Vec::new();
    let mut rest = body;
    while let Some(open) = rest.find("\n  \"") {
        let after = &rest[open + 4..];
        let Some(name_end) = after.find("\": `") else {
            rest = after;
            continue;
        };
        let name = &after[..name_end];
        let source_start = &after[name_end + 4..];

        let mut source_end = None;
        let bytes = source_start.as_bytes();
        let mut index = 0;
        while index < bytes.len() {
            match bytes[index] {
                b'\\' => index += 2,
                b'`' => {
                    source_end = Some(index);
                    break;
                }
                _ => index += 1,
            }
        }
        let Some(source_end) = source_end else {
            panic!("probe {name} has no closing template literal");
        };

        let source = source_start[..source_end]
            .replace("\\`", "`")
            .replace("\\${", "${");
        cases.push((name.to_string(), source));
        rest = &source_start[source_end..];
    }
    cases
}

fn options(semantic_trace: bool) -> CompileOptions {
    CompileOptions {
        module_name: "r-dom".into(),
        built_ins: vec!["For".into(), "Show".into()],
        static_marker: "@once".into(),
        semantic_trace,
        ..CompileOptions::default()
    }
}

fn corpus_sources() -> Vec<(String, String)> {
    fixture_sources()
        .into_iter()
        .map(|(id, source)| (format!("fixture/{id}"), source))
        .chain(
            probe_sources()
                .into_iter()
                .map(|(id, source)| (format!("probe/{id}"), source)),
        )
        .collect()
}

#[test]
fn every_fixture_reconciles_census_against_lowering() {
    let sources = fixture_sources();
    assert!(
        sources.len() >= 88,
        "expected all fixture families, found only {} fixtures",
        sources.len()
    );

    let mut failures = Vec::new();
    let mut reconciled = 0;
    for (id, source) in &sources {
        match compile(source, &options(true)) {
            Ok(output) => {
                assert!(
                    output.semantic_trace.is_some(),
                    "{id}: tracing was requested but no trace came back"
                );
                reconciled += 1;
            }
            Err(error) => {
                let message = error.to_string();
                // The Babel corpus includes a small set of inputs that Oxc
                // intentionally rejects. Only semantic reconciliation errors
                // belong to this census.
                if message.contains("semantic ") {
                    failures.push(format!("{id}: {message}"));
                }
            }
        }
    }

    assert!(
        failures.is_empty(),
        "{} of {} fixtures failed contract reconciliation:\n{}",
        failures.len(),
        sources.len(),
        failures.join("\n")
    );
    assert!(
        reconciled > 40,
        "expected most fixtures to produce a contract, got {reconciled}"
    );
}

#[test]
fn every_parity_probe_reconciles_census_against_lowering() {
    let sources = probe_sources();
    assert_eq!(
        sources.len(),
        494,
        "expected the complete probe corpus, extracted {}",
        sources.len()
    );
    assert!(
        sources.iter().any(|(_, source)| source.contains('`')),
        "template-literal probes were truncated during extraction"
    );

    let mut failures = Vec::new();
    let mut reconciled = 0;
    for (name, source) in &sources {
        match compile(source, &options(true)) {
            Ok(output) => {
                assert!(
                    output.semantic_trace.is_some(),
                    "{name}: tracing was requested but no trace came back"
                );
                reconciled += 1;
            }
            Err(error) => {
                let message = error.to_string();
                if message.contains("semantic ") {
                    failures.push(format!("{name}: {message}"));
                }
            }
        }
    }

    assert!(
        failures.is_empty(),
        "{} of {} probes failed contract reconciliation:\n{}",
        failures.len(),
        sources.len(),
        failures.join("\n")
    );
    assert!(
        reconciled > 400,
        "expected most probes to produce a contract, got {reconciled}"
    );
}

fn expected_baseline() -> std::collections::BTreeMap<&'static str, (bool, Vec<u8>)> {
    include_str!("transform-output-baseline.txt")
        .lines()
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .map(|line| {
            let mut fields = line.split('\t');
            let id = fields.next().expect("baseline id");
            match fields.next().expect("baseline status") {
                "reject" => (id, (false, Vec::new())),
                "ok" => {
                    let encoded = fields.next().expect("baseline output");
                    let bytes = (0..encoded.len())
                        .step_by(2)
                        .map(|index| {
                            u8::from_str_radix(&encoded[index..index + 2], 16)
                                .expect("baseline hex")
                        })
                        .collect();
                    (id, (true, bytes))
                }
                status => panic!("unknown baseline status {status:?}"),
            }
        })
        .collect()
}

fn compare_output(id: &str, actual: &[u8], expected: &[u8]) -> Result<(), String> {
    if actual == expected {
        Ok(())
    } else {
        Err(format!(
            "{id}: transform output differs from the checked-in parent baseline ({} vs {} bytes)",
            actual.len(),
            expected.len()
        ))
    }
}

/// The checked-in bytes are generated from `origin/main`, not from the same
/// build as the code under test. This is the transform() byte-identity
/// invariant for this branch; trace enrichment cannot move output.
#[test]
fn transform_output_matches_parent_baseline() {
    let expected = expected_baseline();
    let sources = corpus_sources();
    assert_eq!(sources.len(), expected.len(), "baseline corpus drifted");
    let mut failures = Vec::new();
    for (id, source) in sources {
        let (compiled, expected_bytes) = expected
            .get(id.as_str())
            .unwrap_or_else(|| panic!("{id}: missing parent baseline"));
        match compile(&source, &options(false)) {
            Ok(output) if *compiled => {
                if let Err(error) = compare_output(&id, output.code.as_bytes(), expected_bytes) {
                    failures.push(error);
                }
            }
            Ok(_) => failures.push(format!("{id}: parent rejected this input")),
            Err(_) if !compiled => {}
            Err(error) => failures.push(format!("{id}: transform failed: {error}")),
        }
    }
    assert!(
        failures.is_empty(),
        "{} output mismatches:\n{}",
        failures.len(),
        failures.join("\n")
    );
}

/// Rewrite `tests/transform-output-baseline.txt` from the current build.
///
/// The baseline is the transform-invariant's only witness, so regenerating it
/// is a deliberate act, not a convenience: it is `#[ignore]`d so no ordinary
/// run reaches it, and gated on an environment variable so
/// `--include-ignored` cannot rewrite the baseline as a side effect. Run it
/// only after `transform_output_matches_parent_baseline` has named every entry
/// that moves and every one of them is a change the branch intends:
///
/// ```sh
/// UPDATE_TRANSFORM_BASELINE=1 cargo test --no-default-features \
///   --test execution_contract_census regenerate_transform_output_baseline \
///   -- --ignored --nocapture
/// ```
///
/// Review the resulting diff line by line. An entry that moves for a reason
/// the branch cannot explain is a codegen regression, not a stale baseline.
#[test]
#[ignore = "rewrites the checked-in transform baseline; see the doc comment"]
fn regenerate_transform_output_baseline() {
    assert!(
        std::env::var_os("UPDATE_TRANSFORM_BASELINE").is_some(),
        "set UPDATE_TRANSFORM_BASELINE=1 to rewrite the baseline"
    );
    let mut lines = String::new();
    for (id, source) in corpus_sources() {
        match compile(&source, &options(false)) {
            Ok(output) => {
                let hex = output
                    .code
                    .as_bytes()
                    .iter()
                    .map(|byte| format!("{byte:02x}"))
                    .collect::<String>();
                lines.push_str(&format!("{id}\tok\t{hex}\n"));
            }
            Err(_) => lines.push_str(&format!("{id}\treject\n")),
        }
    }
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/transform-output-baseline.txt");
    std::fs::write(&path, lines).expect("baseline is writable");
    println!("rewrote {}", path.display());
}

#[test]
fn output_baseline_rejects_a_one_byte_canary() {
    let (_, (_, expected)) = expected_baseline()
        .into_iter()
        .find(|(_, (compiled, bytes))| *compiled && !bytes.is_empty())
        .expect("baseline has a non-empty output");
    let mut canary = expected.clone();
    canary[0] ^= 1;
    assert!(compare_output("one-byte canary", &canary, &expected).is_err());
}
