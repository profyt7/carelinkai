import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getBaseUrl } from '@/lib/http';
import { getMockResident, getMockAssessments, getMockIncidents, getMockNotes } from '@/lib/mock/residents';
import { prisma } from '@/lib/prisma';
import { StatusActions } from '@/components/operator/residents/StatusActions';
import { ArchiveButton } from '@/components/operator/residents/ArchiveButton';
import { CreateNoteForm } from '@/components/operator/residents/forms/CreateNoteForm';
import { CreateAssessmentForm } from '@/components/operator/residents/forms/CreateAssessmentForm';
import { CreateIncidentForm } from '@/components/operator/residents/forms/CreateIncidentForm';
import { CompliancePanel } from '@/components/operator/residents/CompliancePanel';
import { ContactsPanel } from '@/components/operator/residents/ContactsPanel';
import { DocumentsPanel } from '@/components/operator/residents/DocumentsPanel';
import { TimelinePanel } from '@/components/operator/residents/TimelinePanel';
import { ResidentTimeline } from '@/components/operator/residents/ResidentTimeline';
import { ResidentNotes } from '@/components/operator/residents/ResidentNotes';
import { AssessmentsList } from '@/components/operator/residents/AssessmentsList';
import { IncidentsList } from '@/components/operator/residents/IncidentsList';
import { ResidentOverview } from '@/components/operator/residents/ResidentOverview';
import { ResidentPhotoUpload } from '@/components/operator/residents/ResidentPhotoUpload';
import { AssessmentsTab } from '@/components/operator/residents/AssessmentsTab';
import { IncidentsTab } from '@/components/operator/residents/IncidentsTab';
import { ComplianceTab } from '@/components/operator/residents/ComplianceTab';
import { FamilyTab } from '@/components/operator/residents/FamilyTab';
import { ResidentDetailActionsBar } from '@/components/operator/residents/ResidentDetailActions';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Image from 'next/image';
import { FiEdit, FiFileText, FiUser, FiClipboard, FiAlertTriangle, FiShield, FiUsers } from 'react-icons/fi';

async function fetchResident(id: string) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/residents/${id}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load resident');
  return res.json();
}

async function fetchContacts(id: string) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/residents/${id}/contacts`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) return { items: [] };
  return res.json();
}

async function fetchTimeline(id: string) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/residents/${id}/timeline?limit=10`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) return { items: [] };
  return res.json();
}

async function fetchSection(id: string, section: 'assessments' | 'incidents' | 'notes') {
  const cookieHeader = cookies().toString();
  const h = headers();
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/residents/${id}/${section}?limit=5`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function ResidentDetail({ params, searchParams }: { params: { id: string }; searchParams?: { tab?: string } }) {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  
  const activeTab = searchParams?.tab || 'overview';
  
  // Get current user for notes editing permissions
  const session = await getServerSession(authOptions);
  let currentUserId: string | undefined;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    currentUserId = user?.id;
  }
  
  const mockCookie = cookies().get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
  const showMock = ['1','true','yes','on'].includes(mockCookie);
  let resident: any;
  let contacts: any = { items: [] };
  let timeline: any = { items: [] };
  let assessments: any = { items: [] };
  let incidents: any = { items: [] };
  let notes: any = { items: [] };
  
  if (showMock) {
    const r = getMockResident(params.id);
    if (r) {
      resident = r;
      assessments = getMockAssessments(r.id);
      incidents = getMockIncidents(r.id);
      notes = getMockNotes(r.id);
      contacts = { items: [] }; // Mock data doesn't have contacts yet
      timeline = { items: [] }; // Mock data doesn't have timeline yet
    } else {
      // Fallback to live data when ID not in mock set
      const data = await fetchResident(params.id);
      if (!data?.resident) return notFound();
      resident = data.resident;
      [contacts, timeline, assessments, incidents, notes] = await Promise.all([
        fetchContacts(resident.id),
        fetchTimeline(resident.id),
        fetchSection(resident.id, 'assessments'),
        fetchSection(resident.id, 'incidents'),
        fetchSection(resident.id, 'notes'),
      ]);
    }
  } else {
    const data = await fetchResident(params.id);
    if (!data?.resident) return notFound();
    resident = data.resident;
    [contacts, timeline, assessments, incidents, notes] = await Promise.all([
      fetchContacts(resident.id),
      fetchTimeline(resident.id),
      fetchSection(resident.id, 'assessments'),
      fetchSection(resident.id, 'incidents'),
      fetchSection(resident.id, 'notes'),
    ]);
  }
  
  // Calculate age
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  const age = resident.dateOfBirth ? calculateAge(resident.dateOfBirth) : null;
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiUser },
    { id: 'assessments', label: 'Assessments', icon: FiClipboard },
    { id: 'incidents', label: 'Incidents', icon: FiAlertTriangle },
    { id: 'compliance', label: 'Compliance', icon: FiShield },
    { id: 'family', label: 'Family', icon: FiUsers },
    { id: 'details', label: 'Details', icon: FiFileText },
  ];
  
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Operator', href: '/operator' },
        { label: 'Residents', href: '/operator/residents' },
        { label: `${resident.firstName} ${resident.lastName}` }
      ]} />
      
      {/* Header with Photo */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-4">
            {resident.photoUrl ? (
              <Image
                src={resident.photoUrl}
                alt={`${resident.firstName} ${resident.lastName}`}
                width={96}
                height={96}
                className="h-24 w-24 rounded-lg object-cover border-2 border-neutral-200"
              />
            ) : (
              <div className="h-24 w-24 rounded-lg bg-neutral-200 flex items-center justify-center">
                <span className="text-neutral-600 font-semibold text-2xl">
                  {resident.firstName[0]}{resident.lastName[0]}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">{resident.firstName} {resident.lastName}</h1>
              {age && (
                <p className="text-neutral-600 mt-1">{age} years old</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  resident.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  resident.status === 'INQUIRY' ? 'bg-blue-100 text-blue-800' :
                  resident.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  resident.status === 'DISCHARGED' ? 'bg-neutral-100 text-neutral-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {resident.status}
                </span>
                {resident.careNeeds?.roomNumber && (
                  <span className="text-sm text-neutral-600">Room {resident.careNeeds.roomNumber}</span>
                )}
              </div>
            </div>
          </div>
          
          <ResidentDetailActionsBar 
            residentId={resident.id} 
            residentName={`${resident.firstName} ${resident.lastName}`}
            showArchiveButton={!resident.archivedAt}
          />
        </div>
        
        <div className="mt-6">
          <StatusActions residentId={resident.id} status={resident.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/operator/residents/${resident.id}?tab=${tab.id}`}
                className={`
                  inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive 
                    ? 'border-primary-600 text-primary-600' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ResidentOverview 
          resident={{
            ...resident,
            contacts: contacts.items || [],
            timeline: timeline.items || [],
            notes: notes.items || [],
          }} 
        />
      )}

      {activeTab === 'assessments' && (
        <AssessmentsTab residentId={resident.id} />
      )}

      {activeTab === 'incidents' && (
        <IncidentsTab residentId={resident.id} />
      )}

      {activeTab === 'compliance' && (
        <ComplianceTab residentId={resident.id} />
      )}

      {activeTab === 'family' && (
        <FamilyTab residentId={resident.id} />
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-3">
            <CompliancePanel residentId={resident.id} />
          </section>
          <section className="lg:col-span-3">
            <DocumentsPanel residentId={resident.id} />
          </section>
          
          {/* Timeline Section */}
          <section className="lg:col-span-2 card">
            <h2 className="font-semibold mb-4 text-neutral-800 text-lg">Resident Timeline</h2>
            <ResidentTimeline residentId={resident.id} />
          </section>
          
          {/* Quick Actions */}
          <section className="lg:col-span-1 space-y-6">
            <section className="card">
              <h2 className="font-semibold mb-2 text-neutral-800">Assessments</h2>
              <AssessmentsList residentId={resident.id} items={(assessments.items ?? []) as any[]} />
              <CreateAssessmentForm residentId={resident.id} />
            </section>
            <section className="card">
              <h2 className="font-semibold mb-2 text-neutral-800">Incidents</h2>
              <IncidentsList residentId={resident.id} items={(incidents.items ?? []) as any[]} />
              <CreateIncidentForm residentId={resident.id} />
            </section>
          </section>
          
          {/* Notes Section */}
          <section className="lg:col-span-3 card">
            <h2 className="font-semibold mb-4 text-neutral-800 text-lg">Resident Notes</h2>
            <ResidentNotes residentId={resident.id} currentUserId={currentUserId} />
          </section>
        </div>
      )}
    </div>
  );
}

