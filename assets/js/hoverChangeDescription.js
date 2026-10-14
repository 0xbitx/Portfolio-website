export function hoverChangeDescription(nameCard, text) {
  var changeDescription = document.querySelector(".changeDescription");

  var defaultText = `<span>//</span>languages | tools<span>></span>`;

  var show = function (newText) {
    changeDescription.classList.add("fade-out");
    setTimeout(function () {
      changeDescription.innerHTML = newText;
      changeDescription.classList.remove("fade-out");
      changeDescription.classList.add("fade-in");
      setTimeout(function () {
        changeDescription.classList.remove("fade-in");
      }, 250);
    }, 150);
  };

  document.querySelector(nameCard).addEventListener("mouseover", function () {
    show(text);
  });

  document.querySelector(nameCard).addEventListener("mouseout", function () {
    show(defaultText);
  });
}
