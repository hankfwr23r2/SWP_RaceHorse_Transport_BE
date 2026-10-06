package repository;

import entity.BookingAssignment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingAssignmentRepository extends JpaRepository<BookingAssignment, Integer> {
}
