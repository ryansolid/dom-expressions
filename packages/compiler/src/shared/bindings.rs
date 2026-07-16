use oxc_ast::ast::{
    BindingPattern, ImportDeclarationSpecifier, Statement, VariableDeclarationKind,
};

use crate::shared::utils::{static_expression, StaticValue};

/// Module-level binding facts collected while walking statements, shared by
/// all generates. Approximates the parts of Babel's scope analysis the
/// transforms rely on (`path.scope.hasBinding`, `path.evaluate()` over const
/// bindings, `detectResolvableEventHandler`).
#[derive(Default)]
pub(crate) struct BindingTable {
    /// Every locally declared name (any variable kind, function declarations,
    /// imports) — the `scope.hasBinding` approximation.
    pub(crate) declared: std::vec::Vec<String>,
    /// `const`-declared names (destructure-aware) plus imports.
    pub(crate) const_bindings: std::vec::Vec<String>,
    /// Function declarations and function-valued variable initializers
    /// (Babel's `detectResolvableEventHandler` follows both).
    pub(crate) function_bindings: std::vec::Vec<String>,
    /// Confidently string/number-valued bindings for `path.evaluate()`.
    pub(crate) static_bindings: std::vec::Vec<(String, StaticValue)>,
    /// Confidently boolean-valued bindings for `path.evaluate()`.
    pub(crate) static_bool_bindings: std::vec::Vec<(String, bool)>,
    /// `import * as ns` locals — Babel's `isDynamic` treats property access
    /// on namespace imports as static.
    pub(crate) namespace_imports: std::vec::Vec<String>,
    /// Every identifier name appearing anywhere in the program (bindings and
    /// references, any depth). Babel's `generateUid` skips candidates that
    /// collide with any binding, global, or reference; generated locals
    /// consult this so user code that already uses `_el$`-style names can't
    /// clash with compiler output.
    pub(crate) taken_names: std::collections::HashSet<String>,
    /// Span starts of JSX tag identifiers that match a configured built-in
    /// but resolve to a real binding in their scope chain (Babel's
    /// `!path.scope.hasBinding(name)` gate on built-in aliasing). Populated
    /// by a scope-aware pre-scan; scope resolution is position-insensitive,
    /// so a shadowing declaration later in the same scope still counts.
    pub(crate) shadowed_builtin_spans: std::collections::HashSet<u32>,
}

impl BindingTable {
    pub(crate) fn is_const(&self, name: &str) -> bool {
        self.const_bindings.iter().any(|binding| binding == name)
    }

    pub(crate) fn is_function(&self, name: &str) -> bool {
        self.function_bindings.iter().any(|binding| binding == name)
    }

    pub(crate) fn is_namespace_import(&self, name: &str) -> bool {
        self.namespace_imports.iter().any(|binding| binding == name)
    }

    pub(crate) fn is_taken(&self, name: &str) -> bool {
        self.taken_names.contains(name)
    }

    /// Deep pre-scan of the whole program for identifier names (Babel's
    /// `generateUid` collision set). Runs once before transformation.
    pub(crate) fn scan_taken_names(&mut self, program: &oxc_ast::ast::Program<'_>) {
        use oxc_ast_visit::Visit;

        struct TakenNames<'t> {
            taken: &'t mut std::collections::HashSet<String>,
        }

        impl<'b> Visit<'b> for TakenNames<'_> {
            fn visit_binding_identifier(&mut self, it: &oxc_ast::ast::BindingIdentifier<'b>) {
                self.taken.insert(it.name.to_string());
            }
            fn visit_identifier_reference(&mut self, it: &oxc_ast::ast::IdentifierReference<'b>) {
                self.taken.insert(it.name.to_string());
            }
        }

        let mut collector = TakenNames {
            taken: &mut self.taken_names,
        };
        collector.visit_program(program);
    }

    /// Scope-aware pre-scan for built-in shadowing: walks the program with a
    /// scope stack (program, functions with hoisted `var`s, blocks with
    /// lexical declarations, loop heads, catch params) and records the span
    /// of every JSX identifier tag matching a configured built-in that is
    /// shadowed by a binding in scope. Mirrors Babel's `scope.hasBinding`,
    /// which registers all of a scope's declarations up front.
    pub(crate) fn scan_builtin_shadowing(
        &mut self,
        program: &oxc_ast::ast::Program<'_>,
        built_ins: &[String],
    ) {
        if built_ins.is_empty() {
            return;
        }
        let mut scanner = ShadowScanner {
            built_ins,
            scopes: std::vec::Vec::new(),
            shadowed: &mut self.shadowed_builtin_spans,
        };
        use oxc_ast_visit::Visit;
        scanner.visit_program(program);
    }

    pub(crate) fn is_builtin_shadowed(&self, span: oxc_span::Span) -> bool {
        self.shadowed_builtin_spans.contains(&span.start)
    }

    pub(crate) fn collect(&mut self, statement: &Statement<'_>) {
        match statement {
            // Babel's scope registers exported declarations like plain ones.
            Statement::ExportNamedDeclaration(export) => match &export.declaration {
                Some(oxc_ast::ast::Declaration::VariableDeclaration(declaration)) => {
                    self.collect_variable_declaration(declaration);
                }
                Some(oxc_ast::ast::Declaration::FunctionDeclaration(function)) => {
                    if let Some(id) = &function.id {
                        push_unique(&mut self.declared, &id.name);
                        push_unique(&mut self.function_bindings, &id.name);
                    }
                }
                _ => {}
            },
            Statement::VariableDeclaration(declaration) => {
                self.collect_variable_declaration(declaration);
            }
            Statement::FunctionDeclaration(function) => {
                if let Some(id) = &function.id {
                    push_unique(&mut self.declared, &id.name);
                    push_unique(&mut self.function_bindings, &id.name);
                }
            }
            Statement::ImportDeclaration(import_declaration) => {
                if let Some(specifiers) = &import_declaration.specifiers {
                    for specifier in specifiers {
                        let local = match specifier {
                            ImportDeclarationSpecifier::ImportSpecifier(specifier) => {
                                &specifier.local.name
                            }
                            ImportDeclarationSpecifier::ImportDefaultSpecifier(specifier) => {
                                &specifier.local.name
                            }
                            ImportDeclarationSpecifier::ImportNamespaceSpecifier(specifier) => {
                                push_unique(&mut self.namespace_imports, &specifier.local.name);
                                &specifier.local.name
                            }
                        };
                        push_unique(&mut self.declared, local);
                        push_unique(&mut self.const_bindings, local);
                    }
                }
            }
            _ => {}
        }
    }

    fn collect_variable_declaration(
        &mut self,
        declaration: &oxc_ast::ast::VariableDeclaration<'_>,
    ) {
        for declarator in &declaration.declarations {
            collect_binding_names(&declarator.id, &mut self.declared);
            if declaration.kind == VariableDeclarationKind::Const {
                collect_binding_names(&declarator.id, &mut self.const_bindings);
            }
            let BindingPattern::BindingIdentifier(binding) = &declarator.id else {
                continue;
            };
            let name = binding.name.to_string();
            let Some(init) = &declarator.init else {
                continue;
            };
            // Babel's `detectResolvableEventHandler` follows variable
            // declarators of any kind to a function-valued init.
            if matches!(
                init,
                oxc_ast::ast::Expression::ArrowFunctionExpression(_)
                    | oxc_ast::ast::Expression::FunctionExpression(_)
            ) {
                push_unique(&mut self.function_bindings, &name);
            }
            if let oxc_ast::ast::Expression::BooleanLiteral(literal) = init {
                self.static_bool_bindings
                    .retain(|(existing, _)| existing != &name);
                self.static_bool_bindings
                    .push((name.clone(), literal.value));
            }
            let Some(value) = static_expression(init, &self.static_bindings) else {
                continue;
            };
            self.static_bindings
                .retain(|(existing, _)| existing != &name);
            self.static_bindings.push((name, value));
        }
    }
}

pub(crate) fn push_unique(values: &mut std::vec::Vec<String>, value: &str) {
    if !values.iter().any(|existing| existing == value) {
        values.push(value.to_string());
    }
}

fn collect_binding_names(pattern: &BindingPattern<'_>, names: &mut std::vec::Vec<String>) {
    match pattern {
        BindingPattern::BindingIdentifier(binding) => push_unique(names, &binding.name),
        BindingPattern::ArrayPattern(array) => {
            for element in array.elements.iter().flatten() {
                collect_binding_names(element, names);
            }
            if let Some(rest) = &array.rest {
                collect_binding_names(&rest.argument, names);
            }
        }
        BindingPattern::ObjectPattern(object) => {
            for property in &object.properties {
                collect_binding_names(&property.value, names);
            }
            if let Some(rest) = &object.rest {
                collect_binding_names(&rest.argument, names);
            }
        }
        BindingPattern::AssignmentPattern(assignment) => {
            collect_binding_names(&assignment.left, names);
        }
    }
}

/// Read-only walker behind [`BindingTable::scan_builtin_shadowing`]. Frames
/// hold only names that match a configured built-in, so the stack stays tiny.
struct ShadowScanner<'b> {
    built_ins: &'b [String],
    scopes: std::vec::Vec<std::vec::Vec<String>>,
    shadowed: &'b mut std::collections::HashSet<u32>,
}

impl ShadowScanner<'_> {
    fn frame_from_names(&self, names: std::vec::Vec<String>) -> std::vec::Vec<String> {
        names
            .into_iter()
            .filter(|name| self.built_ins.iter().any(|built_in| built_in == name))
            .collect()
    }

    fn in_scope(&self, name: &str) -> bool {
        self.scopes
            .iter()
            .any(|frame| frame.iter().any(|binding| binding == name))
    }

    fn check_tag(&mut self, name: &str, span: oxc_span::Span) {
        if self.built_ins.iter().any(|built_in| built_in == name) && self.in_scope(name) {
            self.shadowed.insert(span.start);
        }
    }

    fn params_frame(&self, params: &oxc_ast::ast::FormalParameters<'_>) -> std::vec::Vec<String> {
        let mut names = std::vec::Vec::new();
        for param in &params.items {
            collect_binding_names(&param.pattern, &mut names);
        }
        if let Some(rest) = &params.rest {
            collect_binding_names(&rest.rest.argument, &mut names);
        }
        self.frame_from_names(names)
    }
}

/// Declarations visible at the top level of a block scope: `let`/`const`,
/// classes, and (module-strict) function declarations.
fn collect_lexical_names(statements: &[Statement<'_>], names: &mut std::vec::Vec<String>) {
    for statement in statements {
        let statement = match statement {
            Statement::ExportNamedDeclaration(export) => match &export.declaration {
                Some(oxc_ast::ast::Declaration::VariableDeclaration(declaration)) => {
                    if declaration.kind != VariableDeclarationKind::Var {
                        for declarator in &declaration.declarations {
                            collect_binding_names(&declarator.id, names);
                        }
                    }
                    continue;
                }
                Some(oxc_ast::ast::Declaration::FunctionDeclaration(function)) => {
                    if let Some(id) = &function.id {
                        names.push(id.name.to_string());
                    }
                    continue;
                }
                Some(oxc_ast::ast::Declaration::ClassDeclaration(class)) => {
                    if let Some(id) = &class.id {
                        names.push(id.name.to_string());
                    }
                    continue;
                }
                _ => continue,
            },
            other => other,
        };
        match statement {
            Statement::VariableDeclaration(declaration)
                if declaration.kind != VariableDeclarationKind::Var =>
            {
                for declarator in &declaration.declarations {
                    collect_binding_names(&declarator.id, names);
                }
            }
            Statement::FunctionDeclaration(function) => {
                if let Some(id) = &function.id {
                    names.push(id.name.to_string());
                }
            }
            Statement::ClassDeclaration(class) => {
                if let Some(id) = &class.id {
                    names.push(id.name.to_string());
                }
            }
            Statement::ImportDeclaration(import) => {
                if let Some(specifiers) = &import.specifiers {
                    for specifier in specifiers {
                        names.push(specifier.local().name.to_string());
                    }
                }
            }
            _ => {}
        }
    }
}

/// Function-scoped hoisting: `var` declarations and function declarations at
/// any statement depth inside a function body, without descending into nested
/// functions or classes.
fn collect_var_names(statements: &[Statement<'_>], names: &mut std::vec::Vec<String>) {
    for statement in statements {
        collect_var_names_from_statement(statement, names);
    }
}

fn collect_var_names_from_statement(statement: &Statement<'_>, names: &mut std::vec::Vec<String>) {
    match statement {
        Statement::VariableDeclaration(declaration)
            if declaration.kind == VariableDeclarationKind::Var =>
        {
            for declarator in &declaration.declarations {
                collect_binding_names(&declarator.id, names);
            }
        }
        Statement::FunctionDeclaration(function) => {
            if let Some(id) = &function.id {
                names.push(id.name.to_string());
            }
        }
        Statement::BlockStatement(block) => collect_var_names(&block.body, names),
        Statement::IfStatement(statement) => {
            collect_var_names_from_statement(&statement.consequent, names);
            if let Some(alternate) = &statement.alternate {
                collect_var_names_from_statement(alternate, names);
            }
        }
        Statement::ForStatement(statement) => {
            if let Some(oxc_ast::ast::ForStatementInit::VariableDeclaration(declaration)) =
                &statement.init
            {
                if declaration.kind == VariableDeclarationKind::Var {
                    for declarator in &declaration.declarations {
                        collect_binding_names(&declarator.id, names);
                    }
                }
            }
            collect_var_names_from_statement(&statement.body, names);
        }
        Statement::ForInStatement(statement) => {
            collect_var_names_from_for_target(&statement.left, names);
            collect_var_names_from_statement(&statement.body, names);
        }
        Statement::ForOfStatement(statement) => {
            collect_var_names_from_for_target(&statement.left, names);
            collect_var_names_from_statement(&statement.body, names);
        }
        Statement::WhileStatement(statement) => {
            collect_var_names_from_statement(&statement.body, names);
        }
        Statement::DoWhileStatement(statement) => {
            collect_var_names_from_statement(&statement.body, names);
        }
        Statement::TryStatement(statement) => {
            collect_var_names(&statement.block.body, names);
            if let Some(handler) = &statement.handler {
                collect_var_names(&handler.body.body, names);
            }
            if let Some(finalizer) = &statement.finalizer {
                collect_var_names(&finalizer.body, names);
            }
        }
        Statement::SwitchStatement(statement) => {
            for case in &statement.cases {
                collect_var_names(&case.consequent, names);
            }
        }
        Statement::LabeledStatement(statement) => {
            collect_var_names_from_statement(&statement.body, names);
        }
        _ => {}
    }
}

fn collect_var_names_from_for_target(
    target: &oxc_ast::ast::ForStatementLeft<'_>,
    names: &mut std::vec::Vec<String>,
) {
    if let oxc_ast::ast::ForStatementLeft::VariableDeclaration(declaration) = target {
        if declaration.kind == VariableDeclarationKind::Var {
            for declarator in &declaration.declarations {
                collect_binding_names(&declarator.id, names);
            }
        }
    }
}

fn collect_for_head_names(
    target: &oxc_ast::ast::ForStatementLeft<'_>,
    names: &mut std::vec::Vec<String>,
) {
    if let oxc_ast::ast::ForStatementLeft::VariableDeclaration(declaration) = target {
        for declarator in &declaration.declarations {
            collect_binding_names(&declarator.id, names);
        }
    }
}

impl<'b> oxc_ast_visit::Visit<'b> for ShadowScanner<'_> {
    fn visit_program(&mut self, program: &oxc_ast::ast::Program<'b>) {
        let mut names = std::vec::Vec::new();
        collect_var_names(&program.body, &mut names);
        collect_lexical_names(&program.body, &mut names);
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_program(self, program);
        self.scopes.pop();
    }

    fn visit_function(
        &mut self,
        function: &oxc_ast::ast::Function<'b>,
        flags: oxc_syntax::scope::ScopeFlags,
    ) {
        let mut names = std::vec::Vec::new();
        // A function expression's own name binds inside itself.
        if let Some(id) = &function.id {
            names.push(id.name.to_string());
        }
        let mut frame = self.frame_from_names(names);
        frame.extend(self.params_frame(&function.params));
        if let Some(body) = &function.body {
            let mut body_names = std::vec::Vec::new();
            collect_var_names(&body.statements, &mut body_names);
            collect_lexical_names(&body.statements, &mut body_names);
            frame.extend(self.frame_from_names(body_names));
        }
        self.scopes.push(frame);
        oxc_ast_visit::walk::walk_function(self, function, flags);
        self.scopes.pop();
    }

    fn visit_arrow_function_expression(
        &mut self,
        arrow: &oxc_ast::ast::ArrowFunctionExpression<'b>,
    ) {
        let mut frame = self.params_frame(&arrow.params);
        if !arrow.expression {
            let mut body_names = std::vec::Vec::new();
            collect_var_names(&arrow.body.statements, &mut body_names);
            collect_lexical_names(&arrow.body.statements, &mut body_names);
            frame.extend(self.frame_from_names(body_names));
        }
        self.scopes.push(frame);
        oxc_ast_visit::walk::walk_arrow_function_expression(self, arrow);
        self.scopes.pop();
    }

    fn visit_block_statement(&mut self, block: &oxc_ast::ast::BlockStatement<'b>) {
        let mut names = std::vec::Vec::new();
        collect_lexical_names(&block.body, &mut names);
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_block_statement(self, block);
        self.scopes.pop();
    }

    fn visit_static_block(&mut self, block: &oxc_ast::ast::StaticBlock<'b>) {
        let mut names = std::vec::Vec::new();
        collect_var_names(&block.body, &mut names);
        collect_lexical_names(&block.body, &mut names);
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_static_block(self, block);
        self.scopes.pop();
    }

    fn visit_for_statement(&mut self, statement: &oxc_ast::ast::ForStatement<'b>) {
        let mut names = std::vec::Vec::new();
        if let Some(oxc_ast::ast::ForStatementInit::VariableDeclaration(declaration)) =
            &statement.init
        {
            for declarator in &declaration.declarations {
                collect_binding_names(&declarator.id, &mut names);
            }
        }
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_for_statement(self, statement);
        self.scopes.pop();
    }

    fn visit_for_in_statement(&mut self, statement: &oxc_ast::ast::ForInStatement<'b>) {
        let mut names = std::vec::Vec::new();
        collect_for_head_names(&statement.left, &mut names);
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_for_in_statement(self, statement);
        self.scopes.pop();
    }

    fn visit_for_of_statement(&mut self, statement: &oxc_ast::ast::ForOfStatement<'b>) {
        let mut names = std::vec::Vec::new();
        collect_for_head_names(&statement.left, &mut names);
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_for_of_statement(self, statement);
        self.scopes.pop();
    }

    fn visit_catch_clause(&mut self, clause: &oxc_ast::ast::CatchClause<'b>) {
        let mut names = std::vec::Vec::new();
        if let Some(param) = &clause.param {
            collect_binding_names(&param.pattern, &mut names);
        }
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_catch_clause(self, clause);
        self.scopes.pop();
    }

    fn visit_class(&mut self, class: &oxc_ast::ast::Class<'b>) {
        // A class expression's own name binds inside its body.
        let mut names = std::vec::Vec::new();
        if let Some(id) = &class.id {
            names.push(id.name.to_string());
        }
        self.scopes.push(self.frame_from_names(names));
        oxc_ast_visit::walk::walk_class(self, class);
        self.scopes.pop();
    }

    fn visit_jsx_element_name(&mut self, name: &oxc_ast::ast::JSXElementName<'b>) {
        match name {
            oxc_ast::ast::JSXElementName::Identifier(identifier) => {
                self.check_tag(&identifier.name, identifier.span);
            }
            oxc_ast::ast::JSXElementName::IdentifierReference(identifier) => {
                self.check_tag(&identifier.name, identifier.span);
            }
            _ => {}
        }
        oxc_ast_visit::walk::walk_jsx_element_name(self, name);
    }
}
