import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function renderReportCharts({ statusChart, priorityChart, projectChart }) {
  const configs = [
    { id: 'statusChart', data: statusChart },
    { id: 'priorityChart', data: priorityChart },
    { id: 'projectChart', data: projectChart },
  ];

  configs.forEach(({ id, data }) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Количество',
            data: data.counts,
            backgroundColor: '#0d47a1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  });
}

