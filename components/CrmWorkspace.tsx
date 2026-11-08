"use client";

import configuration from "@/config/crm.json";
import { crmWorkspaceUrl } from "@/lib/crm-config";

const nonprofitUrl = crmWorkspaceUrl(configuration.nonprofitWorkspaceUrl);
const businessUrl = crmWorkspaceUrl(configuration.businessWorkspaceUrl);

export default function CrmWorkspace() {
  return (
    <section className="crm-workspace" aria-labelledby="crm-heading">
      <div className="crm-intro card">
        <div>
          <span className="small-label">
            RELATIONSHIPS THAT SUPPORT YOUR MISSION
          </span>
          <h2 id="crm-heading">A home for every relationship.</h2>
          <p>
            CiviCRM brings funders, donors, and follow-ups together. Keep your
            nonprofit relationships separate from GrantProof’s own sales
            workspace.
          </p>
        </div>
        <div className="crm-provider">
          <strong>CiviCRM</strong>
          <span>Open-source CRM · separate sign-in</span>
          <span className="tag neutral">
            {nonprofitUrl || businessUrl
              ? "Workspace links configured"
              : "Activation pending"}
          </span>
        </div>
      </div>

      <div className="crm-areas">
        <article className="card crm-area">
          <span className="crm-area-number">01</span>
          <h3>Funders & grants</h3>
          <p>
            Know who to contact, what is due, and which conversation comes next.
          </p>
          <ul>
            <li>Funding organizations and their contacts</li>
            <li>Grant opportunities, deadlines, and next steps</li>
            <li>Meeting notes and follow-up activities</li>
          </ul>
          <div className="crm-stage-list" aria-label="Suggested grant stages">
            <span>Research</span>
            <span>Application</span>
            <span>Decision</span>
          </div>
          <small>Suggested workflow for your nonprofit CRM</small>
        </article>
        <article className="card crm-area">
          <span className="crm-area-number">02</span>
          <h3>Donors & fundraising</h3>
          <p>
            Build long-term support with clear records and thoughtful
            stewardship.
          </p>
          <ul>
            <li>Donor relationships and contribution history</li>
            <li>Campaigns, pledges, and recurring support</li>
            <li>Communication preferences and thank-you tasks</li>
          </ul>
          <div className="crm-stage-list" aria-label="Suggested donor stages">
            <span>Connect</span>
            <span>Support</span>
            <span>Steward</span>
          </div>
          <small>Payments and email campaigns require separate setup</small>
        </article>
        <article className="card crm-area">
          <span className="crm-area-number">03</span>
          <h3>GrantProof sales</h3>
          <p>
            Manage product inquiries in a business workspace with its own staff
            access.
          </p>
          <ul>
            <li>Prospective customers and organizations</li>
            <li>Demos, qualified opportunities, and follow-ups</li>
            <li>Customer onboarding and relationship notes</li>
          </ul>
          <div className="crm-stage-list" aria-label="Suggested sales stages">
            <span>Inquiry</span>
            <span>Demo</span>
            <span>Customer</span>
          </div>
          <small>Sales stages use configured fields and activities</small>
        </article>
      </div>

      <div className="crm-access-grid">
        <WorkspaceAccess
          name="Nonprofit workspace"
          description="Funders, donors, grants, and stewardship. Each nonprofit needs its own access boundary."
          url={nonprofitUrl}
        />
        <WorkspaceAccess
          name="GrantProof business workspace"
          description="Product leads, demos, and customers. Separate from nonprofit-owned contact records."
          url={businessUrl}
        />
      </div>

      <div className="crm-trust-note">
        <strong>Your relationships. Your control.</strong>
        <p>
          CRM contacts are not approved grant evidence. Staff still review every
          source and approve the exact report before export.
        </p>
      </div>
      <details className="card crm-setup">
        <summary>What needs to happen before activation?</summary>
        <ol>
          <li>
            Install the reviewed CRM release in an isolated workspace and finish
            administrator setup.
          </li>
          <li>
            Set staff permissions, sign-in protection, and backups; verify
            access with separate test users.
          </li>
          <li>
            Configure the approved workspace links and connect lead intake
            through LeadFlow.
          </li>
          <li>
            Test with fictional contacts before importing real records or
            enabling communications.
          </li>
        </ol>
        <p>
          This screen is a CRM launch point. It does not create contacts, send
          messages, accept donations, or synchronize CRM records. A configured
          link does not verify a CRM connection.
        </p>
      </details>
    </section>
  );
}

function WorkspaceAccess({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string | null;
}) {
  return (
    <article className="card crm-access">
      <div>
        <h3>{name}</h3>
        <p>{description}</p>
      </div>
      {url ? (
        <a
          className="primary"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open CRM sign-in ↗
        </a>
      ) : (
        <span className="crm-not-connected">
          Setup required · not connected
        </span>
      )}
    </article>
  );
}
