from sqlmodel import Session, select

from app.core.db import engine
from app.ticket.models import RequirementTicket, TicketStage
from app.ticket.service import transition_stage
from app.ticket.workflow.transitions import get_valid_next_stages

with Session(engine) as session:
    ticket = session.exec(select(RequirementTicket)).first()
    print('Current stage:', ticket.current_stage)
    valid_next = get_valid_next_stages(ticket.current_stage)
    print('Valid next:', valid_next)

    # Try to move forward if it's requirement_created
    if ticket.current_stage == TicketStage.REQUIREMENT_CREATED:
        transition_stage(session=session, ticket_id=ticket.id, target_stage=TicketStage.CANDIDATES_ADDED)
        print('Moved to CANDIDATES_ADDED')
        ticket = session.exec(select(RequirementTicket)).first()

    print('Stage now:', ticket.current_stage)
    valid_next_now = get_valid_next_stages(ticket.current_stage)
    print('Valid next now:', valid_next_now)

    # Move backward
    if TicketStage.REQUIREMENT_CREATED in valid_next_now:
        transition_stage(session=session, ticket_id=ticket.id, target_stage=TicketStage.REQUIREMENT_CREATED)
        print('Successfully moved BACKWARD!')
        ticket = session.exec(select(RequirementTicket)).first()
        print('Final stage:', ticket.current_stage)
