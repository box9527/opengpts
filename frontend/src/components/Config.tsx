import { Fragment, useEffect, useState } from "react";
import { ShareIcon } from "@heroicons/react/24/outline";
import { useDropzone } from "react-dropzone";
import { orderBy, last } from "lodash";

import { ConfigListProps } from "../hooks/useConfigList";
import { SchemaField, Schemas } from "../hooks/useSchemas";
import { cn } from "../utils/cn";
import { FileUploadDropzone } from "./FileUpload";
import { Combobox, Dialog, Switch, Transition } from "@headlessui/react";
import { DROPZONE_CONFIG, TYPES } from "../constants";
import { Tool, ToolSchema } from "../utils/formTypes.ts";
import { useToolsSchemas } from "../hooks/useToolsSchemas.ts";
import {
  ChevronUpDownIcon,
  Cog6ToothIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { marked } from "marked";

function Types(props: {
  field: SchemaField;
  value: string;
  readonly: boolean;
  setValue: (value: string) => void;
  alwaysExpanded?: boolean;
}) {
  const options =
    props.field.enum?.map((id) => TYPES[id as keyof typeof TYPES]) ?? [];
  return (
    <div className="-mx-8 mt-6 pt-4 border-t-2 border-dotted mb-8">
      <div className="mx-8 sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          defaultValue={options.find((o) => o.id === props.value)?.id}
          onChange={(e) => props.setValue(e.target.value)}
        >
          {options.map((option) => (
            <option key={option.id}>{option.title}</option>
          ))}
        </select>
      </div>
      <div className="mx-8 hidden sm:block">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            {options.map((option) => (
              <div
                key={option.id}
                className={cn(
                  props.value === option.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                  "w-1/4 border-b-2 py-4 px-1 text-center text-sm font-medium cursor-pointer",
                )}
                aria-current={props.value === option.id ? "page" : undefined}
                onClick={() => props.setValue(option.id)}
              >
                {option.title}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function Label(props: { id?: string; title: string; description?: string }) {
  return (
    <label
      htmlFor={props.id}
      className="flex flex-col font-medium leading-6 text-gray-400 mb-2"
    >
      <div>{props.title}</div>
      {props.description && (
        <div className="font-normal text-sm text-gray-600 whitespace-pre-line">
          {props.description}
        </div>
      )}
    </label>
  );
}

function StringField(props: {
  id: string;
  field: SchemaField;
  value: string;
  title: string;
  readonly: boolean;
  setValue: (value: string) => void;
}) {
  return (
    <div>
      <Label
        id={props.id}
        title={props.title}
        description={props.field.description}
      />
      <textarea
        rows={4}
        name={props.id}
        id={props.id}
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        value={props.value}
        readOnly={props.readonly}
        disabled={props.readonly}
        onChange={(e) => props.setValue(e.target.value)}
      />
    </div>
  );
}

export default function SingleOptionField(props: {
  id: string;
  field: SchemaField;
  value: string;
  title: string;
  readonly: boolean;
  setValue: (value: string) => void;
}) {
  return (
    <div>
      <Label
        id={props.id}
        title={props.field.title}
        description={props.field.description}
      />
      <fieldset>
        <legend className="sr-only">{props.field.title}</legend>
        <div className="space-y-2">
          {orderBy(props.field.enum)?.map((option) => (
            <div key={option} className="flex items-center">
              <input
                id={`${props.id}-${option}`}
                name={props.id}
                type="radio"
                checked={option === props.value}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                disabled={props.readonly}
                onChange={() => props.setValue(option)}
              />
              <label
                htmlFor={`${props.id}-${option}`}
                className="ml-3 block leading-6 text-gray-900"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function ToolSelectionField(props: {
  selectedTools: Tool[];
  onAddTool: (tool: Tool) => void;
  onRemoveTool: (toolId: string) => void;
  onUpdateToolConfig: (
    toolId: string,
    config: {
      [key: string]: string;
    },
  ) => void;
}) {
  const { tools: availableTools, loading } = useToolsSchemas();
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [query, setQuery] = useState("");

  const handleSelectTool = (toolSchema: ToolSchema) => {
    // Initialize config object based on ToolSchema
    const config: { [key: string]: string } = {};
    Object.keys(toolSchema.config.properties).forEach((key) => {
      const property = toolSchema.config.properties[key];
      // Use the default value if specified, otherwise initialize to an empty string
      config[key] = property.default || "";
    });

    // Create a new tool object with initialized config
    const tool: Tool = {
      id: toolSchema.id,
      type: toolSchema.type,
      name: toolSchema.name,
      description: toolSchema.description,
      config: config,
    };

    if (Object.keys(config).length === 0) {
      props.onAddTool(tool);
    } else {
      setSelectedTool(tool);
    }
    setQuery(""); // Clear the query
  };

  // Filter tools based on the query
  const filteredTools =
    query === ""
      ? availableTools
      : availableTools.filter((tool) =>
          tool.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, "")),
        );

  const handleDialogClose = () => {
    setSelectedTool(null);
  };

  const saveAndClose = () => {
    if (
      selectedTool &&
      !props.selectedTools.some((t) => t.id === selectedTool.id)
    ) {
      props.onAddTool(selectedTool);
    }
    setSelectedTool(null);
  };

  // Render function for the selected tool's configuration dialog
  const renderConfigDialog = () => {
    return (
      <Transition appear show={!!selectedTool} as={Fragment}>
        <Dialog className="relative z-50" onClose={handleDialogClose}>
          {/* The backdrop, rendered as a fixed sibling to the panel container */}
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          {/* Full-screen container to center the panel */}
          <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-sm rounded bg-gray-100 p-4 font-light">
              <Dialog.Title className="font-semibold">
                {selectedTool?.name}
              </Dialog.Title>
              {selectedTool?.description && (
                <Dialog.Description
                  className="text-gray-500 prose prose-sm prose-a:text-gray-500"
                  dangerouslySetInnerHTML={{
                    __html: marked(selectedTool?.description ?? ""),
                  }}
                />
              )}

              {/* Dynamically generate input fields for the selected tool's config */}
              {selectedTool?.config &&
                Object.entries(selectedTool.config).map(([key, value]) => (
                  <div
                    className="flex flex-col justify-between pt-2 pb-2"
                    key={key}
                  >
                    <label htmlFor={key}>{key}</label>
                    <input
                      id={key}
                      value={value || ""}
                      onChange={(e) => {
                        setSelectedTool({
                          ...selectedTool,
                          config: {
                            ...selectedTool?.config,
                            [key]: e.target.value,
                          },
                        });
                      }}
                      className="input-styles rounded-md"
                      autoComplete="off"
                    />
                  </div>
                ))}

              <div className="flex pt-3 justify-between">
                <button
                  className="relative inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 bg-white"
                  onClick={handleDialogClose}
                >
                  Cancel
                </button>
                <button
                  className="relative inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 bg-white"
                  onClick={saveAndClose}
                >
                  Save
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    );
  };

  // Render function to display each selected tool and its config, with edit and remove options
  const renderSelectedTool = (tool: Tool, index: number) => (
    <div
      key={"tool-" + index}
      className="flex max-w-2xl items-center justify-between p-2 border-b border-gray-200 transition duration-150 ease-in-out"
    >
      <div className="text-sm leading-6 flex-grow">
        <label>{tool.name}</label>
        {tool.description && (
          <div
            className="text-gray-500 prose prose-sm prose-a:text-gray-500"
            dangerouslySetInnerHTML={{
              __html: marked(tool.description),
            }}
          ></div>
        )}
      </div>
      {Object.keys(tool.config).length > 0 && (
      <button
        onClick={() => {
          setSelectedTool(tool);
        }}
        className="text-gray-400 hover:text-indigo-600 mr-4"
      >
        <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />
      </button>)}
      <button
        onClick={() => props.onRemoveTool(tool.id)}
        className="text-gray-400 hover:text-red-600"
      >
        <TrashIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Label title="Tools" />
      {props.selectedTools.map(renderSelectedTool)}
      <div className="w-full max-w-2xl">
        <Combobox value={null} onChange={handleSelectTool}>
          <div className="relative mt-1">
            <Combobox.Input
              className="w-full border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              onChange={(event) => setQuery(event.target.value)}
              displayValue={() => ""}
              placeholder="Add a tool"
              autoComplete="off"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {filteredTools.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Nothing found.
                  </div>
                ) : (
                  filteredTools.map((tool) => (
                    <Combobox.Option
                      key={tool.id}
                      value={tool}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-2 pr-4 ${active ? "bg-indigo-100 text-indigo-900" : "text-gray-900"}`
                      }
                    >
                      <span className={`block truncate font-normal`}>
                        {tool.name}
                      </span>
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Transition>
          </div>
        </Combobox>
      </div>
      {renderConfigDialog()}
    </div>
  );
}

function PublicLink(props: { assistantId: string }) {
  const currentLink = window.location.href;
  const link = currentLink.includes("shared_id=")
    ? currentLink
    : currentLink + "?shared_id=" + props.assistantId;
  return (
    <div className="flex rounded-md shadow-sm mb-4">
      <button
        type="submit"
        className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-l-md px-3 py-2 text-sm font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50 bg-white"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await navigator.clipboard.writeText(link);
          window.alert("Copied to clipboard!");
        }}
      >
        <ShareIcon
          className="-ml-0.5 h-5 w-5 text-gray-400"
          aria-hidden="true"
        />
        Copy Public Link
      </button>
      <a
        className="rounded-none rounded-r-md py-1.5 px-2 text-gray-900 border border-l-0 border-gray-300 text-sm leading-6 line-clamp-1 flex-1 underline"
        href={link}
      >
        {link}
      </a>
    </div>
  );
}

function PublicToggle(props: {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  className?: string;
}) {
  return (
    <Switch.Group as="div" className={cn("flex items-center", props.className)}>
      <Switch
        checked={props.enabled}
        onChange={props.setEnabled}
        className={cn(
          props.enabled ? "bg-indigo-600" : "bg-gray-200",
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            props.enabled ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          )}
        />
      </Switch>
      <Switch.Label as="span" className="ml-3 text-sm">
        <span className="font-medium text-gray-900">Public?</span>
      </Switch.Label>
    </Switch.Group>
  );
}

function fileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

const ORDER = [
  "system_message",
  "retrieval_description",
  "interrupt_before_action",
  "tools",
  "llm_type",
  "agent_type",
];

export function Config(props: {
  className?: string;
  configSchema: Schemas["configSchema"];
  configDefaults: Schemas["configDefaults"];
  config: ConfigListProps["currentConfig"];
  saveConfig: ConfigListProps["saveConfig"];
}) {
  const [values, setValues] = useState(
    props.config?.config ?? props.configDefaults,
  );
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const typeKey = "type";
  const typeField =
    props.configSchema?.properties.configurable.properties[typeKey];
  const typeValue = values?.configurable?.[typeKey];
  const typeSpec = typeValue ? TYPES[typeValue as keyof typeof TYPES] : null;
  const [files, setFiles] = useState<File[]>([]);
  const dropzone = useDropzone(DROPZONE_CONFIG);
  const [isPublic, setPublic] = useState(props.config?.public ?? false);

  const handleAddTool = (tool: Tool) => {
    setSelectedTools([...selectedTools, tool]);
  };

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter((tool) => tool.id !== toolId));
  };

  const handleUpdateToolConfig = (toolId: string, config: ToolConfig) => {
    const updatedTools = selectedTools.map((tool) =>
      tool.id === toolId ? { ...tool, config } : tool,
    );
    setSelectedTools(updatedTools);
  };

  useEffect(() => {
    setValues(props.config?.config ?? props.configDefaults);
  }, [props.config, props.configDefaults]);
  useEffect(() => {
    if (dropzone.acceptedFiles.length > 0) {
      if (typeValue === "agent") {
        const toolsKey = "type==agent/tools";
        setValues((values) => ({
          configurable: {
            ...values?.configurable,
            [toolsKey]: [
              ...((values?.configurable?.[toolsKey] ?? []) as string[]).filter(
                (tool) => tool !== "Retrieval",
              ),
              { id: "retrieval" },
            ],
          },
        }));
      }
      const acceptedFileIds = dropzone.acceptedFiles.map(fileId);
      setFiles((files) => [
        ...files.filter((f) => !acceptedFileIds.includes(fileId(f))),
        ...dropzone.acceptedFiles,
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropzone.acceptedFiles]);
  const [inflight, setInflight] = useState(false);
  const readonly = !!props.config && !inflight;

  const settings = !props.config ? (
    <div className="flex flex-row gap-4">
      <div className="flex flex-row flex-1">
        <div className="relative flex flex-grow items-stretch focus-within:z-10">
          <input
            type="text"
            name="key"
            id="key"
            autoComplete="off"
            className="block w-full rounded-none rounded-l-md border-0 py-1.5 pl-4 text-gray-900 ring-1 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ring-inset ring-gray-300"
            placeholder="Name your bot"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
        >
          {inflight ? "Saving..." : "Save"}
        </button>
      </div>

      <PublicToggle enabled={isPublic} setEnabled={setPublic} />
    </div>
  ) : (
    <>
      {props.config.public && (
        <PublicLink assistantId={props.config?.assistant_id} />
      )}
    </>
  );
  return (
    <form
      className={cn("flex flex-col", props.className)}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const form = e.target as HTMLFormElement;
        const key = form.key.value;
        if (!key) return;
        setInflight(true);
        if (values?.configurable) {
          values.configurable["type==agent/tools"] = [...selectedTools];
        }
        await props.saveConfig(key, values!, files, isPublic);
        setInflight(false);
      }}
    >
      {settings}
      {typeField && (
        <Types
          field={typeField}
          value={typeValue as string}
          setValue={(value: string) =>
            setValues({
              ...values,
              configurable: { ...values!.configurable, [typeKey]: value },
            })
          }
          readonly={readonly}
        />
      )}

      {typeSpec?.description && (
        <>
          <Label title="Description" />
          <div className="prose mb-8">{typeSpec.description}</div>
        </>
      )}

      {!props.config && typeSpec?.files && (
        <FileUploadDropzone
          state={dropzone}
          files={files}
          setFiles={setFiles}
          className="mb-8"
        />
      )}
      <div
        className={cn(
          "flex flex-col gap-8",
          readonly && "opacity-50 cursor-not-allowed",
        )}
      >
        {orderBy(
          Object.entries(
            props.configSchema?.properties.configurable.properties ?? {},
          ),
          ([key]) => ORDER.indexOf(last(key.split("/"))!),
        ).map(([key, value]) => {
          const title = value.title;
          if (key.split("/")[0].includes("==")) {
            const [parentKey, parentValue] = key.split("/")[0].split("==");
            if (values?.configurable?.[parentKey] !== parentValue) {
              return null;
            }
          } else {
            return null;
          }
          if (
            last(key.split("/")) === "retrieval_description" &&
            !files.length
          ) {
            return null;
          }
          if (value.type === "string" && value.enum) {
            return (
              <SingleOptionField
                key={key}
                id={key}
                field={value}
                title={title}
                value={values?.configurable?.[key] as string}
                setValue={(value: string) =>
                  setValues({
                    ...values,
                    configurable: { ...values!.configurable, [key]: value },
                  })
                }
                readonly={readonly}
              />
            );
          } else if (value.type === "string") {
            return (
              <StringField
                key={key}
                id={key}
                field={value}
                title={title}
                value={values?.configurable?.[key] as string}
                setValue={(value: string) =>
                  setValues({
                    ...values,
                    configurable: { ...values!.configurable, [key]: value },
                  })
                }
                readonly={readonly}
              />
            );
          } else if (value.type === "boolean") {
            return (
              <SingleOptionField
                key={key}
                id={key}
                field={{
                  ...value,
                  type: "string",
                  enum: ["Yes", "No"],
                }}
                title={title}
                value={values?.configurable?.[key] ? "Yes" : "No"}
                setValue={(value: string) =>
                  setValues({
                    ...values,
                    configurable: {
                      ...values!.configurable,
                      [key]: value === "Yes",
                    },
                  })
                }
                readonly={readonly}
              />
            );
          } else if (key === "type==agent/tools") {
            return (
              <ToolSelectionField
                key={key}
                selectedTools={selectedTools}
                onAddTool={handleAddTool}
                onRemoveTool={handleRemoveTool}
                onUpdateToolConfig={handleUpdateToolConfig}
              />
            );
          }
        })}
      </div>
    </form>
  );
}
