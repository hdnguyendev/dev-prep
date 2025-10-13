import { createContext } from "react";

export const AppContext = createContext({});

export const AppContextProvider = (props: { children: React.ReactNode }) => {
  const value = {
  };
  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};