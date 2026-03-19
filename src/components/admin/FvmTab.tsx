import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FvmQuestionsCRUD from "./FvmQuestionsCRUD";
import FvmConsulta from "./FvmConsulta";
import NaoConformidades from "./NaoConformidades";

const FvmTab = () => {
  return (
    <Tabs defaultValue="perguntas" className="space-y-4">
      <TabsList>
        <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
        <TabsTrigger value="consulta">Consulta FVMs</TabsTrigger>
        <TabsTrigger value="ncs">Não Conformidades</TabsTrigger>
      </TabsList>
      <TabsContent value="perguntas"><FvmQuestionsCRUD /></TabsContent>
      <TabsContent value="consulta"><FvmConsulta /></TabsContent>
      <TabsContent value="ncs"><NaoConformidades /></TabsContent>
    </Tabs>
  );
};

export default FvmTab;
