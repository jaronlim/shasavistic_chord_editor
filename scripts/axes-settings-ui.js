import { DIMENSION_LABELS, PRIME_LABELS, projectSettingFields } from './settings.js';

const AXES_GROUP = 'Axes';

export function buildAxesGrid(createInput) {
    const fields = new Map(
        projectSettingFields.map((descriptor) => [descriptor.path, descriptor])
    );

    const table = document.createElement('table');
    table.id = 'axes-settings-table';

    const caption = document.createElement('caption');
    caption.className = 'settings-group-header';
    caption.textContent = AXES_GROUP;
    table.appendChild(caption);

    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th'));
    for (const label of DIMENSION_LABELS) {
        const cell = document.createElement('th');
        cell.textContent = label;
        headerRow.appendChild(cell);
    }
    table.appendChild(headerRow);

    PRIME_LABELS.forEach((prime, primeIndex) => {
        const row = document.createElement('tr');
        const labelCell = document.createElement('th');
        labelCell.textContent = `p${prime}`;
        row.appendChild(labelCell);
        for (let dim = 0; dim < DIMENSION_LABELS.length; dim++) {
            const cell = document.createElement('td');
            cell.appendChild(createInput(fields.get(`axes.${dim}.${primeIndex}`)));
            row.appendChild(cell);
        }
        table.appendChild(row);
    });

    return table;
}
