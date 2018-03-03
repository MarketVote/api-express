document.addEventListener('DOMContentLoaded', function(evt) {

});

function addConBlurb() { //eslint-disable-line
  const conBlurb = document.querySelector('#conBlurbGeneric').cloneNode(true);
  const conBlurbPane = document.querySelector('#conBlurbFrame');

  conBlurb.style = '';
  conBlurb.id = '';

  conBlurbPane.appendChild(conBlurb);
}

function addProBlurb() { //eslint-disable-line
  const proBlurb = document.querySelector('#proBlurbGeneric').cloneNode(true);
  const proBlurbPane = document.querySelector('#proBlurbFrame');

  proBlurb.style = '';
  proBlurb.id = '';

  proBlurbPane.appendChild(proBlurb);
}

function addTag() { //eslint-disable-line
  const tag = document.querySelector('#tagGeneric').cloneNode(true);
  const tagPane = document.querySelector('#tagFrame');

  tag.style = '';
  tag.id = '';

  tagPane.appendChild(tag);
}
