const allImgBloks = document.querySelectorAll('.hero__img');
if (allImgBloks.length > 0) {
    const randomIndex = Math.floor(Math.random() * allImgBloks.length);
    const randomBlock = allImgBloks[randomIndex];
    randomBlock.classList.add('is-visible');
}
