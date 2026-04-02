function censor() {
    let arr = [];
    return (firstElement, secondElement) => {
        if (secondElement === undefined) {
            for (i = 0; i < arr.length; i++) {
                firstElement = firstElement.replace(
                    new RegExp(arr[i].firstElement, 'gi'),
                    arr[i].secondElement
                );
            }
            return( firstElement);
        } else {
            arr.push({ firstElement, secondElement });
        }
    };
}

const changeScene = censor();

changeScene('PHP', 'Java');

changeScene('backend', 'frontend');
console.log(changeScene('PHP is the most popular programming language for backend web-development. '));