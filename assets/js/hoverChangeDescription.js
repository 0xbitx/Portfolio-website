export function hoverChangeDescription(nameCard, text) {
  var changeDescription = document.querySelector(".changeDescription");

  document.querySelector(nameCard).addEventListener("mouseover", () => {
    changeDescription.innerHTML = text;
  });

  document.querySelector(nameCard).addEventListener("mouseout", () => {
    changeDescription.innerHTML = `languages / tools `;
  });
}
