<script>
  document.addEventListener('DOMContentLoaded', function () {
    const toggleElement = document.getElementById('toggle-bsc');
    const docs = document.getElementById('bsc-docs');
    const arrow = document.getElementById('arrow');

    toggleElement.addEventListener('click', function () {
      const isOpen = docs.style.display === 'block';
      docs.style.display = isOpen ? 'none' : 'block';
      arrow.textContent = isOpen ? '▾' : '▴';
    });
  });
</script>



