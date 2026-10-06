package repository;

import entity.ServiceBooking;
import entity.ServiceBookingId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceBookingRepository extends JpaRepository<ServiceBooking, ServiceBookingId> {
}
