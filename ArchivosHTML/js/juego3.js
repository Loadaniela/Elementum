document.addEventListener('DOMContentLoaded', () => {
    const pieces = document.querySelectorAll('.piece');
    const cells = document.querySelectorAll('.cell');

    pieces.forEach(piece => {
        piece.addEventListener('dragstart', dragStart);
    });

    cells.forEach(cell => {
        cell.addEventListener('dragover', dragOver);
        cell.addEventListener('drop', drop);
    });

    function dragStart(event) {
        event.dataTransfer.setData('text', event.target.dataset.element);
    }

    function dragOver(event) {
        event.preventDefault();
    }

    function drop(event) {
        event.preventDefault();
        const element = event.dataTransfer.getData('text');
        if (event.target.dataset.element === element) {
            const piece = document.querySelector(`.piece[data-element="${element}"]`);
            event.target.appendChild(piece);
            piece.draggable = false;
        }
    }
});
