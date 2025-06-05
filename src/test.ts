import Excel from "exceljs";
import path from "path";

(async () => {
    const workbook = new Excel.stream.xlsx.WorkbookReader(path.join(process.cwd(), 'db.xlsx'), {});
    const db2 = new Excel.Workbook();
    await db2.xlsx.readFile(path.join(process.cwd(), 'db2.xlsx'));

    let collisionCount = 0;
    for await (const worksheetReader of workbook) {
        for await (const row of worksheetReader) {
            if (Array.isArray(row.values) && typeof row.values[3] === 'string') {
                const v = row.values[3];
                for (const s of db2.worksheets) {
                    const column = s.getColumn(13);
                    column.eachCell(cell => {
                        if (typeof cell.value === 'string' && cell.value.toLowerCase().trim() ===  'ип ' + v.toLowerCase().trim()) {
                            collisionCount++;
                            console.log(collisionCount);
                        }
                    })
                }
            } else {

            }
            
        }
    }
})();