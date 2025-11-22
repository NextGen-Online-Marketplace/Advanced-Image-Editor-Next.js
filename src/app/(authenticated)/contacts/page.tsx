"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TagsManager from "./_components/TagsManager";
import PeopleManager from "./_components/PeopleManager";
import ClientManager from "./_components/ClientManager";
import AgencyManager from "./_components/AgencyManager";

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Contacts</h2>
        <p className="text-muted-foreground">Manage your contacts, agents, teams, agencies, clients, and people</p>
      </div>

      <Tabs defaultValue="tags-manager" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="agent-teams">Agent Teams</TabsTrigger>
          <TabsTrigger value="agencies">Agencies</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="tags-manager">Tags Manager</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents" className="mt-6">
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-2">Agents</h3>
            <p className="text-muted-foreground">Manage your agents here.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="agent-teams" className="mt-6">
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-2">Agent Teams</h3>
            <p className="text-muted-foreground">Manage your agent teams here.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="agencies" className="mt-6">
          <AgencyManager />
        </TabsContent>
        
        <TabsContent value="clients" className="mt-6">
          <ClientManager />
        </TabsContent>
        
        <TabsContent value="people" className="mt-6">
          <PeopleManager />
        </TabsContent>
        
        <TabsContent value="tags-manager" className="mt-6">
          <TagsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

