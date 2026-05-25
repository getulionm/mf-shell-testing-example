const repoRoot =
  "https://github.com/getulionm/mf-shell-testing-example/blob/master";
const docsBase = `${repoRoot}/docs`;

const learningLinks = [
  {
    href: `${repoRoot}/README.md`,
    label: "Learning index",
  },
  {
    href: `${docsBase}/fundamentals-walkthrough.md`,
    label: "Fundamentals walkthrough",
  },
  {
    href: `${docsBase}/contract-first-curriculum.md`,
    label: "Contract-first curriculum",
  },
  {
    href: `${docsBase}/workshop-labs.md`,
    label: "Workshop labs",
  },
  {
    href: `${repoRoot}/README.md#testing-strategy`,
    label: "Testing strategy",
  },
];

export function renderLearningManual(container: HTMLElement) {
  container.innerHTML = `
    <section class="learning-manual" data-testid="learning-manual">
      <div class="learning-manual-header">
        <h2>Learning manual</h2>
        <p>Docs for this demo. The control plane below is the app under test.</p>
      </div>
      <ul class="learning-manual-links">
        ${learningLinks
          .map(
            (link) =>
              `<li><a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a></li>`
          )
          .join("")}
      </ul>
    </section>
  `;
}
