import { useEffect, useState } from 'react';
import { Banner } from "@douyinfe/semi-ui";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { databases } from "../../../data/databases";
import { db } from "../../../data/db";
import { supabase } from '../../Workspace';

export default function Open({ selectedDiagramId, setSelectedDiagramId }) {
  const [allDiagrams, setAllDiagrams] = useState([]);
  const localDiagrams = useLiveQuery(() => db.diagrams.toArray());
  const { t } = useTranslation();

  useEffect(() => {
    async function loadAllDiagrams() {
      try {
        // Get Supabase diagrams
        const { data: supaDiagrams, error } = await supabase
          .from('diagrams')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // Start with local diagrams
        const mergedDiagrams = [...(localDiagrams || [])];
        
        // Add Supabase diagrams if they're not in local
        supaDiagrams?.forEach(remoteDiagram => {
          const localExists = mergedDiagrams.find(d => d.id === remoteDiagram.local_id);
          if (!localExists) {
            mergedDiagrams.push({
              id: remoteDiagram.local_id,
              name: remoteDiagram.name,
              ...remoteDiagram.content,
              lastModified: new Date(remoteDiagram.updated_at)
            });
          }
        });

        setAllDiagrams(mergedDiagrams);
      } catch (error) {
        console.error('Error loading diagrams:', error);
      }
    }

    loadAllDiagrams();
  }, [localDiagrams]);

  const getDiagramSize = (d) => {
    const size = JSON.stringify(d).length;
    let sizeStr;
    if (size >= 1024 && size < 1024 * 1024)
      sizeStr = (size / 1024).toFixed(1) + "KB";
    else if (size >= 1024 * 1024)
      sizeStr = (size / (1024 * 1024)).toFixed(1) + "MB";
    else sizeStr = size + "B";

    return sizeStr;
  };

  return (
    <div>
      {allDiagrams?.length === 0 ? (
        <Banner
          fullMode={false}
          type="info"
          bordered
          icon={null}
          closeIcon={null}
          description={<div>You have no saved diagrams.</div>}
        />
      ) : (
        <div className="max-h-[360px]">
          <table className="w-full text-left border-separate border-spacing-x-0">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("last_modified")}</th>
                <th>{t("size")}</th>
                <th>{t("type")}</th>
              </tr>
            </thead>
            <tbody>
              {allDiagrams?.map((d) => {
                return (
                  <tr
                    key={d.id}
                    className={`${
                      selectedDiagramId === d.id
                        ? "bg-blue-300 bg-opacity-30"
                        : "hover-1"
                    }`}
                    onClick={() => {
                      setSelectedDiagramId(d.id);
                    }}
                  >
                    <td className="py-1">
                      <i className="bi bi-file-earmark-text text-[16px] me-1 opacity-60" />
                      {d.name}
                    </td>
                    <td className="py-1">
                      {d.lastModified.toLocaleDateString() +
                        " " +
                        d.lastModified.toLocaleTimeString()}
                    </td>
                    <td className="py-1">{getDiagramSize(d)}</td>
                    <td className="py-1">
                      {databases[d.database]?.name ?? "Generic"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}