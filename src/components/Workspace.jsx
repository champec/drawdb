import { useState, useEffect, useCallback, createContext } from "react";
import ControlPanel from "./EditorHeader/ControlPanel";
import Canvas from "./EditorCanvas/Canvas";
import { CanvasContextProvider } from "../context/CanvasContext";
import SidePanel from "./EditorSidePanel/SidePanel";
import { DB, State } from "../data/constants";
import { db } from "../data/db";
import { v4 as uuidv4 } from 'uuid';
import {
  useLayout,
  useSettings,
  useTransform,
  useDiagram,
  useUndoRedo,
  useAreas,
  useNotes,
  useTypes,
  useTasks,
  useSaveState,
  useEnums,
} from "../hooks";
import FloatingControls from "./FloatingControls";
import { Modal } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { databases } from "../data/databases";
import { isRtl } from "../i18n/utils/rtl";
import { useSearchParams } from "react-router-dom";
import { octokit } from "../data/octokit";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY;



// Add validation
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


export const IdContext = createContext({ gistId: "" });

export default function WorkSpace() {
  const [id, setId] = useState(0);
  const [gistId, setGistId] = useState("");
  const [loadedFromGistId, setLoadedFromGistId] = useState("");
  const [title, setTitle] = useState("Untitled Diagram");
  const [resize, setResize] = useState(false);
  const [width, setWidth] = useState(340);
  const [lastSaved, setLastSaved] = useState("");
  const [showSelectDbModal, setShowSelectDbModal] = useState(false);
  const [selectedDb, setSelectedDb] = useState("");
  const { layout } = useLayout();
  const { settings } = useSettings();
  const { types, setTypes } = useTypes();
  const { areas, setAreas } = useAreas();
  const { tasks, setTasks } = useTasks();
  const { notes, setNotes } = useNotes();
  const { saveState, setSaveState } = useSaveState();
  const { transform, setTransform } = useTransform();
  const { enums, setEnums } = useEnums();
  const {
    tables,
    relationships,
    setTables,
    setRelationships,
    database,
    setDatabase,
  } = useDiagram();
  const { undoStack, redoStack, setUndoStack, setRedoStack } = useUndoRedo();
  const { t, i18n } = useTranslation();
  let [searchParams, setSearchParams] = useSearchParams();
  const handleResize = (e) => {
    if (!resize) return;
    const w = isRtl(i18n.language) ? window.innerWidth - e.clientX : e.clientX;
    if (w > 340) setWidth(w);
  };

  // const save = useCallback(async () => {
  //   const name = window.name.split(" ");
  //   const op = name[0];
  //   const saveAsDiagram = window.name === "" || op === "d" || op === "lt";

  //   if (saveAsDiagram) {
  //     searchParams.delete("shareId");
  //     setSearchParams(searchParams);
  //     if (
  //       (id === 0 && window.name === "") ||
  //       window.name.split(" ")[0] === "lt"
  //     ) {
  //       await db.diagrams
  //         .add({
  //           database: database,
  //           name: title,
  //           gistId: gistId ?? "",
  //           lastModified: new Date(),
  //           tables: tables,
  //           references: relationships,
  //           notes: notes,
  //           areas: areas,
  //           todos: tasks,
  //           pan: transform.pan,
  //           zoom: transform.zoom,
  //           loadedFromGistId: loadedFromGistId,
  //           ...(databases[database].hasEnums && { enums: enums }),
  //           ...(databases[database].hasTypes && { types: types }),
  //         })
  //         .then((id) => {
  //           setId(id);
  //           window.name = `d ${id}`;
  //           setSaveState(State.SAVED);
  //           setLastSaved(new Date().toLocaleString());
  //         });
  //     } else {
  //       await db.diagrams
  //         .update(id, {
  //           database: database,
  //           name: title,
  //           lastModified: new Date(),
  //           tables: tables,
  //           references: relationships,
  //           notes: notes,
  //           areas: areas,
  //           todos: tasks,
  //           gistId: gistId ?? "",
  //           pan: transform.pan,
  //           zoom: transform.zoom,
  //           loadedFromGistId: loadedFromGistId,
  //           ...(databases[database].hasEnums && { enums: enums }),
  //           ...(databases[database].hasTypes && { types: types }),
  //         })
  //         .then(() => {
  //           setSaveState(State.SAVED);
  //           setLastSaved(new Date().toLocaleString());
  //         });
  //     }
  //   } else {
  //     await db.templates
  //       .update(id, {
  //         database: database,
  //         title: title,
  //         tables: tables,
  //         relationships: relationships,
  //         notes: notes,
  //         subjectAreas: areas,
  //         todos: tasks,
  //         pan: transform.pan,
  //         zoom: transform.zoom,
  //         ...(databases[database].hasEnums && { enums: enums }),
  //         ...(databases[database].hasTypes && { types: types }),
  //       })
  //       .then(() => {
  //         setSaveState(State.SAVED);
  //         setLastSaved(new Date().toLocaleString());
  //       })
  //       .catch(() => {
  //         setSaveState(State.ERROR);
  //       });
  //   }
  // }, [
  //   searchParams,
  //   setSearchParams,
  //   tables,
  //   relationships,
  //   notes,
  //   areas,
  //   types,
  //   title,
  //   id,
  //   tasks,
  //   transform,
  //   setSaveState,
  //   database,
  //   enums,
  //   gistId,
  //   loadedFromGistId,
  // ]);
  
  const save = useCallback(async () => {
    const name = window.name.split(" ");
    const op = name[0];
    const saveAsDiagram = window.name === "" || op === "d" || op === "lt";
  
    if (saveAsDiagram) {
      searchParams.delete("shareId");
      setSearchParams(searchParams);
      
      try {
        // Prepare diagram data
        const diagramData = {
          database: database,
          name: title,
          lastModified: new Date(),
          tables: tables,
          references: relationships,
          notes: notes,
          areas: areas,
          todos: tasks,
          pan: transform.pan,
          zoom: transform.zoom,
          loadedFromGistId: loadedFromGistId,
          ...(databases[database].hasEnums && { enums: enums }),
          ...(databases[database].hasTypes && { types: types }),
        };
  
        // For new diagrams, generate UUID
        const diagramId = id === 0 ? uuidv4() : id;
  
        // Save to Dexie
        if (id === 0 || window.name === "" || window.name.split(" ")[0] === "lt") {
          await db.diagrams.add({
            id: diagramId,
            ...diagramData,
            gistId: gistId ?? "",
          });
          setId(diagramId);
          window.name = `d ${diagramId}`;
        } else {
          await db.diagrams.update(id, {
            ...diagramData,
            gistId: gistId ?? "",
          });
        }
  
        // Save to Supabase
        const { error: supabaseError } = await supabase
          .from('diagrams')
          .upsert({
            local_id: diagramId,
            name: title,
            content: diagramData,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'local_id'
          });
  
        if (supabaseError) throw supabaseError;
  
        setSaveState(State.SAVED);
        setLastSaved(new Date().toLocaleString());
  
      } catch (error) {
        console.error('Error saving diagram:', error);
        setSaveState(State.ERROR);
      }
    } else {
      // Handle template saving
      await db.templates
        .update(id, {
          database: database,
          title: title,
          tables: tables,
          relationships: relationships,
          notes: notes,
          subjectAreas: areas,
          todos: tasks,
          pan: transform.pan,
          zoom: transform.zoom,
          ...(databases[database].hasEnums && { enums: enums }),
          ...(databases[database].hasTypes && { types: types }),
        })
        .then(() => {
          setSaveState(State.SAVED);
          setLastSaved(new Date().toLocaleString());
        })
        .catch(() => {
          setSaveState(State.ERROR);
        });
    }
  }, [
    searchParams,
    setSearchParams,
    tables,
    relationships,
    notes,
    areas,
    types,
    title,
    id,
    tasks,
    transform,
    setSaveState,
    database,
    enums,
    gistId,
    loadedFromGistId,
  ]);

  // const load = useCallback(async () => {
  //   const loadLatestDiagram = async () => {
  //     await db.diagrams
  //       .orderBy("lastModified")
  //       .last()
  //       .then((d) => {
  //         if (d) {
  //           if (d.database) {
  //             setDatabase(d.database);
  //           } else {
  //             setDatabase(DB.GENERIC);
  //           }
  //           setId(d.id);
  //           setGistId(d.gistId);
  //           setLoadedFromGistId(d.loadedFromGistId);
  //           setTitle(d.name);
  //           setTables(d.tables);
  //           setRelationships(d.references);
  //           setNotes(d.notes);
  //           setAreas(d.areas);
  //           setTasks(d.todos ?? []);
  //           setTransform({ pan: d.pan, zoom: d.zoom });
  //           if (databases[database].hasTypes) {
  //             setTypes(d.types ?? []);
  //           }
  //           if (databases[database].hasEnums) {
  //             setEnums(d.enums ?? []);
  //           }
  //           window.name = `d ${d.id}`;
  //         } else {
  //           window.name = "";
  //           if (selectedDb === "") setShowSelectDbModal(true);
  //         }
  //       })
  //       .catch((error) => {
  //         console.log(error);
  //       });
  //   };

  //   const loadDiagram = async (id) => {
  //     await db.diagrams
  //       .get(id)
  //       .then((diagram) => {
  //         if (diagram) {
  //           if (diagram.database) {
  //             setDatabase(diagram.database);
  //           } else {
  //             setDatabase(DB.GENERIC);
  //           }
  //           setId(diagram.id);
  //           setGistId(diagram.gistId);
  //           setLoadedFromGistId(diagram.loadedFromGistId);
  //           setTitle(diagram.name);
  //           setTables(diagram.tables);
  //           setRelationships(diagram.references);
  //           setAreas(diagram.areas);
  //           setNotes(diagram.notes);
  //           setTasks(diagram.todos ?? []);
  //           setTransform({
  //             pan: diagram.pan,
  //             zoom: diagram.zoom,
  //           });
  //           setUndoStack([]);
  //           setRedoStack([]);
  //           if (databases[database].hasTypes) {
  //             setTypes(diagram.types ?? []);
  //           }
  //           if (databases[database].hasEnums) {
  //             setEnums(diagram.enums ?? []);
  //           }
  //           window.name = `d ${diagram.id}`;
  //         } else {
  //           window.name = "";
  //         }
  //       })
  //       .catch((error) => {
  //         console.log(error);
  //       });
  //   };

  //   const loadTemplate = async (id) => {
  //     await db.templates
  //       .get(id)
  //       .then((diagram) => {
  //         if (diagram) {
  //           if (diagram.database) {
  //             setDatabase(diagram.database);
  //           } else {
  //             setDatabase(DB.GENERIC);
  //           }
  //           setId(diagram.id);
  //           setTitle(diagram.title);
  //           setTables(diagram.tables);
  //           setRelationships(diagram.relationships);
  //           setAreas(diagram.subjectAreas);
  //           setTasks(diagram.todos ?? []);
  //           setNotes(diagram.notes);
  //           setTransform({
  //             zoom: 1,
  //             pan: { x: 0, y: 0 },
  //           });
  //           setUndoStack([]);
  //           setRedoStack([]);
  //           if (databases[database].hasTypes) {
  //             setTypes(diagram.types ?? []);
  //           }
  //           if (databases[database].hasEnums) {
  //             setEnums(diagram.enums ?? []);
  //           }
  //         } else {
  //           if (selectedDb === "") setShowSelectDbModal(true);
  //         }
  //       })
  //       .catch((error) => {
  //         console.log(error);
  //         if (selectedDb === "") setShowSelectDbModal(true);
  //       });
  //   };

  //   if (window.name === "") {
  //     loadLatestDiagram();
  //   } else {
  //     const name = window.name.split(" ");
  //     const op = name[0];
  //     const id = parseInt(name[1]);
  //     switch (op) {
  //       case "d": {
  //         loadDiagram(id);
  //         break;
  //       }
  //       case "t":
  //       case "lt": {
  //         loadTemplate(id);
  //         break;
  //       }
  //       default:
  //         break;
  //     }
  //   }
  // }, [
  //   setTransform,
  //   setRedoStack,
  //   setUndoStack,
  //   setRelationships,
  //   setTables,
  //   setAreas,
  //   setNotes,
  //   setTypes,
  //   setTasks,
  //   setDatabase,
  //   database,
  //   setEnums,
  //   selectedDb,
  // ]);

  const load = useCallback(async () => {
    const loadLatestDiagram = async () => {
      try {
        // Try to get latest from Supabase first
        const { data: supabaseDiagrams, error } = await supabase
          .from('diagrams')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);
  
        if (!error && supabaseDiagrams?.length > 0) {
          const remoteDiagram = supabaseDiagrams[0];
          
          // Update local storage
          await db.diagrams.put({
            id: remoteDiagram.local_id,
            ...remoteDiagram.content,
            lastModified: new Date(remoteDiagram.updated_at)
          });
  
          // Load diagram data
          setDatabase(remoteDiagram.content.database || DB.GENERIC);
          setId(remoteDiagram.local_id);
          setGistId(remoteDiagram.content.gistId || "");
          setLoadedFromGistId(remoteDiagram.content.loadedFromGistId || "");
          setTitle(remoteDiagram.name);
          setTables(remoteDiagram.content.tables);
          setRelationships(remoteDiagram.content.references);
          setNotes(remoteDiagram.content.notes);
          setAreas(remoteDiagram.content.areas);
          setTasks(remoteDiagram.content.todos ?? []);
          setTransform({ 
            pan: remoteDiagram.content.pan, 
            zoom: remoteDiagram.content.zoom 
          });
          
          if (databases[remoteDiagram.content.database]?.hasTypes) {
            setTypes(remoteDiagram.content.types ?? []);
          }
          if (databases[remoteDiagram.content.database]?.hasEnums) {
            setEnums(remoteDiagram.content.enums ?? []);
          }
          
          window.name = `d ${remoteDiagram.local_id}`;
          return;
        }
  
        // Fallback to local storage
        await db.diagrams.orderBy("lastModified").last()
          .then((d) => {
            if (d) {
              if (d.database) {
                setDatabase(d.database);
              } else {
                setDatabase(DB.GENERIC);
              }
              setId(d.id);
              setGistId(d.gistId);
              setLoadedFromGistId(d.loadedFromGistId);
              setTitle(d.name);
              setTables(d.tables);
              setRelationships(d.references);
              setNotes(d.notes);
              setAreas(d.areas);
              setTasks(d.todos ?? []);
              setTransform({ pan: d.pan, zoom: d.zoom });
              if (databases[database].hasTypes) {
                setTypes(d.types ?? []);
              }
              if (databases[database].hasEnums) {
                setEnums(d.enums ?? []);
              }
              window.name = `d ${d.id}`;
            } else {
              window.name = "";
              if (selectedDb === "") setShowSelectDbModal(true);
            }
          });
  
      } catch (error) {
        console.error('Error loading latest diagram:', error);
        setSaveState(State.FAILED_TO_LOAD);
      }
    };
  
    const loadDiagram = async (id) => {
      try {
        // Try Supabase first
        const { data: remoteDiagram, error } = await supabase
          .from('diagrams')
          .select('*')
          .eq('local_id', id)
          .single();
  
        if (!error && remoteDiagram) {
          // Update local storage
          await db.diagrams.put({
            id: remoteDiagram.local_id,
            ...remoteDiagram.content,
            lastModified: new Date(remoteDiagram.updated_at)
          });
  
          // Load the diagram
          setDatabase(remoteDiagram.content.database || DB.GENERIC);
          setId(remoteDiagram.local_id);
          setGistId(remoteDiagram.content.gistId || "");
          setLoadedFromGistId(remoteDiagram.content.loadedFromGistId || "");
          setTitle(remoteDiagram.name);
          setTables(remoteDiagram.content.tables);
          setRelationships(remoteDiagram.content.references);
          setAreas(remoteDiagram.content.areas);
          setNotes(remoteDiagram.content.notes);
          setTasks(remoteDiagram.content.todos ?? []);
          setTransform({
            pan: remoteDiagram.content.pan,
            zoom: remoteDiagram.content.zoom,
          });
          if (databases[database].hasTypes) {
            setTypes(remoteDiagram.content.types ?? []);
          }
          if (databases[database].hasEnums) {
            setEnums(remoteDiagram.content.enums ?? []);
          }
          window.name = `d ${remoteDiagram.local_id}`;
          return;
        }
  
        // Fallback to local storage
        const diagram = await db.diagrams.get(id);
        if (diagram) {
          setDatabase(diagram.database || DB.GENERIC);
          setId(diagram.id);
          setGistId(diagram.gistId);
          setLoadedFromGistId(diagram.loadedFromGistId);
          setTitle(diagram.name);
          setTables(diagram.tables);
          setRelationships(diagram.references);
          setAreas(diagram.areas);
          setNotes(diagram.notes);
          setTasks(diagram.todos ?? []);
          setTransform({
            pan: diagram.pan,
            zoom: diagram.zoom,
          });
          setUndoStack([]);
          setRedoStack([]);
          if (databases[database].hasTypes) {
            setTypes(diagram.types ?? []);
          }
          if (databases[database].hasEnums) {
            setEnums(diagram.enums ?? []);
          }
          window.name = `d ${diagram.id}`;
        } else {
          window.name = "";
          Toast.error(t("didnt_find_diagram"));
        }
      } catch (error) {
        console.error('Error loading diagram:', error);
        Toast.error(t("didnt_find_diagram"));
      }
    };
  
    const loadTemplate = async (id) => {
      await db.templates
        .get(id)
        .then((diagram) => {
          if (diagram) {
            if (diagram.database) {
              setDatabase(diagram.database);
            } else {
              setDatabase(DB.GENERIC);
            }
            setId(diagram.id);
            setTitle(diagram.title);
            setTables(diagram.tables);
            setRelationships(diagram.relationships);
            setAreas(diagram.subjectAreas);
            setTasks(diagram.todos ?? []);
            setNotes(diagram.notes);
            setTransform({
              zoom: 1,
              pan: { x: 0, y: 0 },
            });
            setUndoStack([]);
            setRedoStack([]);
            if (databases[database].hasTypes) {
              setTypes(diagram.types ?? []);
            }
            if (databases[database].hasEnums) {
              setEnums(diagram.enums ?? []);
            }
          } else {
            if (selectedDb === "") setShowSelectDbModal(true);
          }
        })
        .catch((error) => {
          console.log(error);
          if (selectedDb === "") setShowSelectDbModal(true);
        });
    };
  
    // Initial load based on window.name
    if (window.name === "") {
      loadLatestDiagram();
    } else {
      const name = window.name.split(" ");
      const op = name[0];
      const id = name[1];
      switch (op) {
        case "d": {
          loadDiagram(id);
          break;
        }
        case "t":
        case "lt": {
          loadTemplate(id);
          break;
        }
        default:
          break;
      }
    }
  }, [
    setTransform,
    setRedoStack,
    setUndoStack,
    setRelationships,
    setTables,
    setAreas,
    setNotes,
    setTypes,
    setTasks,
    setDatabase,
    database,
    setEnums,
    selectedDb,
  ]);

  const loadFromGist = useCallback(
    async (shareId) => {
      const existingDiagram = await db.diagrams.get({
        loadedFromGistId: shareId,
      });
      if (existingDiagram) {
        window.name = "d " + existingDiagram.id;
      } else {
        window.name = "";
      }
      try {
        const res = await octokit.request(`GET /gists/${shareId}`, {
          gist_id: shareId,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
        const diagramSrc = res.data.files["share.json"].content;
        const d = JSON.parse(diagramSrc);
        setUndoStack([]);
        setRedoStack([]);
        setLoadedFromGistId(shareId);
        setDatabase(d.database);
        setTitle(d.title);
        setTables(d.tables);
        setRelationships(d.relationships);
        setNotes(d.notes);
        setAreas(d.subjectAreas);
        setTransform(d.transform);
        if (databases[d.database].hasTypes) {
          setTypes(d.types ?? []);
        }
        if (databases[d.database].hasEnums) {
          setEnums(d.enums ?? []);
        }
      } catch (e) {
        console.log(e);
        setSaveState(State.FAILED_TO_LOAD);
      }
    },
    [
      setAreas,
      setDatabase,
      setEnums,
      setNotes,
      setRelationships,
      setTables,
      setTypes,
      setTransform,
      setRedoStack,
      setUndoStack,
      setSaveState,
    ],
  );

  useEffect(() => {
    if (
      tables?.length === 0 &&
      areas?.length === 0 &&
      notes?.length === 0 &&
      types?.length === 0 &&
      tasks?.length === 0
    )
      return;

    if (settings.autosave) {
      setSaveState(State.SAVING);
    }
  }, [
    undoStack,
    redoStack,
    settings.autosave,
    tables?.length,
    areas?.length,
    notes?.length,
    types?.length,
    relationships?.length,
    tasks?.length,
    transform.zoom,
    title,
    setSaveState,
  ]);

  useEffect(() => {
    if (gistId && gistId !== "") {
      setSaveState(State.SAVING);
    }
  }, [gistId, setSaveState]);

  useEffect(() => {
    if (saveState !== State.SAVING) return;

    save();
  }, [id, gistId, saveState, save]);

  useEffect(() => {
    document.title = "Editor | drawDB";

    const shareId = searchParams.get("shareId");
    if (shareId) {
      loadFromGist(shareId);
    } else {
      load();
    }
  }, [load, searchParams, loadFromGist]);

  return (
    <div className="h-full flex flex-col overflow-hidden theme">
      <IdContext.Provider value={{ gistId, setGistId }}>
        <ControlPanel
          diagramId={id}
          setDiagramId={setId}
          title={title}
          setTitle={setTitle}
          lastSaved={lastSaved}
          setLastSaved={setLastSaved}
        />
      </IdContext.Provider>
      <div
        className="flex h-full overflow-y-auto"
        onPointerUp={(e) => e.isPrimary && setResize(false)}
        onPointerLeave={(e) => e.isPrimary && setResize(false)}
        onPointerMove={(e) => e.isPrimary && handleResize(e)}
        onPointerDown={(e) => {
          // Required for onPointerLeave to trigger when a touch pointer leaves
          // https://stackoverflow.com/a/70976017/1137077
          e.target.releasePointerCapture(e.pointerId);
        }}
        style={isRtl(i18n.language) ? { direction: "rtl" } : {}}
      >
        {layout.sidebar && (
          <SidePanel resize={resize} setResize={setResize} width={width} />
        )}
        <div className="relative w-full h-full overflow-hidden">
          <CanvasContextProvider className="h-full w-full">
            <Canvas saveState={saveState} setSaveState={setSaveState} />
          </CanvasContextProvider>
          {!(layout.sidebar || layout.toolbar || layout.header) && (
            <div className="fixed right-5 bottom-4">
              <FloatingControls />
            </div>
          )}
        </div>
      </div>
      <Modal
        centered
        size="medium"
        closable={false}
        hasCancel={false}
        title={t("pick_db")}
        okText={t("confirm")}
        visible={showSelectDbModal}
        onOk={() => {
          if (selectedDb === "") return;
          setDatabase(selectedDb);
          setShowSelectDbModal(false);
        }}
        okButtonProps={{ disabled: selectedDb === "" }}
      >
        <div className="grid grid-cols-3 gap-4 place-content-center">
          {Object.values(databases).map((x) => (
            <div
              key={x.name}
              onClick={() => setSelectedDb(x.label)}
              className={`space-y-3 py-3 px-4 rounded-md border-2 select-none ${
                settings.mode === "dark"
                  ? "bg-zinc-700 hover:bg-zinc-600"
                  : "bg-zinc-100 hover:bg-zinc-200"
              } ${selectedDb === x.label ? "border-zinc-400" : "border-transparent"}`}
            >
              <div className="font-semibold">{x.name}</div>
              {x.image && (
                <img
                  src={x.image}
                  className="h-10"
                  style={{
                    filter:
                      "opacity(0.4) drop-shadow(0 0 0 white) drop-shadow(0 0 0 white)",
                  }}
                />
              )}
              <div className="text-xs">{x.description}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
