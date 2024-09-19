const template = (
  <html>
    <head>
      <title>🔥 Blazing 🔥</title>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="/styles.css" />
      <Assets />
    </head>
    <body>
      <header>
        <h1>Welcome to the Jungle</h1>
      </header>
      <App />
      <footer>The Bottom</footer>
    </body>
  </html>
);

const templateHead = (
  <head>
    <title>🔥 Blazing 🔥</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/styles.css" />
    <Assets />
  </head>
);

const templateBody = (
  <body>
    <header>
      <h1>Welcome to the Jungle</h1>
    </header>
    <App />
    <footer>The Bottom</footer>
  </body>
);

const templateEmptied = (
  <html>
    <Head />
    <Body />
  </html>
);

// ideally we'd remove the insert on conditional but its a bit tricky
const notInHead = (
  <div>
    <title>🔥 Blazing 🔥</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {someCondition ? <link rel="stylesheet" href="/styles.css" /> : null}
    <style>{`div { background-color: red }`}</style>
    <meta name="description" itemprop="section" />
    <script>{`console.log("hi")`}</script>
    <script src="/script.js" />
    <script src="/async.js" async />
  </div>
);


const notInHeadComponent = (
  <Comp>
    <title>🔥 Blazing 🔥</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {someCondition ? <link rel="stylesheet" href="/styles.css" /> : null}
    <style>{`div { background-color: red }`}</style>
    <meta name="description" itemprop="section" />
    <script>{`console.log("hi")`}</script>
    <script src="/script.js" />
    <script src="/async.js" async />
  </Comp>
);

const notInHeadFragment = (
  <>
    <title>🔥 Blazing 🔥</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    {someCondition ? <link rel="stylesheet" href="/styles.css" /> : null}
    <style>{`div { background-color: red }`}</style>
    <meta name="description" itemprop="section" />
    <script>{`console.log("hi")`}</script>
    <script src="/script.js" />
    <script src="/async.js" async />
  </>
);