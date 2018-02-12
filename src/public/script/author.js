document.addEventListener('DOMContentLoaded', function(evt) {

});

function addConBlurb() {
  const conBlurb = document.querySelector('#conBlurbGeneric').cloneNode(true);
  const conBlurbPane = document.querySelector('#conBlurbFrame');

  conBlurb.style = '';
  conBlurb.id = '';

  conBlurbPane.appendChild(conBlurb);
}

function addProBlurb() {
  const proBlurb = document.querySelector('#proBlurbGeneric').cloneNode(true);
  const proBlurbPane = document.querySelector('#proBlurbFrame');

  proBlurb.style = '';
  proBlurb.id = '';

  proBlurbPane.appendChild(proBlurb);
}
